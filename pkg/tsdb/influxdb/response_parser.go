package influxdb

import (
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

type ResponseParser struct{}

var (
	legendFormat = regexp.MustCompile(`\[\[([\@\/\w-]+)(\.[\@\/\w-]+)*\]\]*|\$([\@\w-]+?)*`)
)

func (rp *ResponseParser) Parse(buf io.ReadCloser, queries []Query) *backend.QueryDataResponse {
	resp := backend.NewQueryDataResponse()

	response, jsonErr := parseJSON(buf)

	if jsonErr != nil {
		resp.Responses["A"] = backend.DataResponse{Error: jsonErr}
		return resp
	}

	if response.Error != "" {
		resp.Responses["A"] = backend.DataResponse{Error: fmt.Errorf(response.Error)}
		return resp
	}

	for i, result := range response.Results {
		if result.Error != "" {
			resp.Responses[queries[i].RefID] = backend.DataResponse{Error: fmt.Errorf(result.Error)}
		} else {
			resp.Responses[queries[i].RefID] = backend.DataResponse{Frames: transformRows(result.Series, queries[i])}
		}
	}

	return resp
}

func parseJSON(buf io.ReadCloser) (Response, error) {
	var response Response

	dec := json.NewDecoder(buf)
	dec.UseNumber()

	err := dec.Decode(&response)

	return response, err
}

func transformRows(rows []Row, query Query) data.Frames {
	frames := data.Frames{}
	for _, row := range rows {
		var hasTimeCol = false

		for _, column := range row.Columns {
			if strings.ToLower(column) == "time" {
				hasTimeCol = true
			}
		}

		if !hasTimeCol {
			var values []string

			for _, valuePair := range row.Values {
				if strings.Contains(strings.ToLower(query.RawQuery), strings.ToLower("SHOW TAG VALUES")) {
					if len(valuePair) >= 2 {
						values = append(values, valuePair[1].(string))
					}
				} else {
					if len(valuePair) >= 1 {
						values = append(values, valuePair[0].(string))
					}
				}
			}

			field := data.NewField("value", nil, values)
			frames = append(frames, data.NewFrame(row.Name, field))
		} else {
			timeIndex := "Time"

			for colIndex, column := range row.Columns {
				if strings.ToLower(column) == "time" {
					timeIndex = column
					continue
				}

				var timeArray []time.Time
				var floatArray []*float64
				var stringArray []*string
				var boolArray []*bool
				valType := typeof(row.Values, colIndex)
				name := formatFrameName(row, column, query)

				for _, valuePair := range row.Values {
					timestamp, timestampErr := parseTimestamp(valuePair[0])
					// we only add this row if the timestamp is valid
					if timestampErr == nil {
						timeArray = append(timeArray, timestamp)
						switch valType {
						case "string":
							{
								value, chk := valuePair[colIndex].(string)
								if chk {
									stringArray = append(stringArray, &value)
								} else {
									stringArray = append(stringArray, nil)
								}
							}
						case "json.Number":
							value := parseNumber(valuePair[colIndex])
							floatArray = append(floatArray, value)
						case "bool":
							value, chk := valuePair[colIndex].(bool)
							if chk {
								boolArray = append(boolArray, &value)
							} else {
								boolArray = append(boolArray, nil)
							}
						case "null":
							floatArray = append(floatArray, nil)
						}
					}
				}

				timeField := data.NewField(timeIndex, nil, timeArray)
				if valType == "string" {
					valueField := data.NewField("value", row.Tags, stringArray)
					valueField.SetConfig(&data.FieldConfig{DisplayNameFromDS: name})
					frames = append(frames, newDataFrame(name, query.RawQuery, timeField, valueField))
				} else if valType == "json.Number" {
					valueField := data.NewField("value", row.Tags, floatArray)
					valueField.SetConfig(&data.FieldConfig{DisplayNameFromDS: name})
					frames = append(frames, newDataFrame(name, query.RawQuery, timeField, valueField))
				} else if valType == "bool" {
					valueField := data.NewField("value", row.Tags, boolArray)
					valueField.SetConfig(&data.FieldConfig{DisplayNameFromDS: name})
					frames = append(frames, newDataFrame(name, query.RawQuery, timeField, valueField))
				} else if valType == "null" {
					valueField := data.NewField("value", row.Tags, floatArray)
					valueField.SetConfig(&data.FieldConfig{DisplayNameFromDS: name})
					frames = append(frames, newDataFrame(name, query.RawQuery, timeField, valueField))
				}
			}
		}
	}

	return frames
}

func newDataFrame(name string, queryString string, timeField *data.Field, valueField *data.Field) *data.Frame {
	frame := data.NewFrame(name, timeField, valueField)
	frame.Meta = &data.FrameMeta{
		ExecutedQueryString: queryString,
	}

	return frame
}

func formatFrameName(row Row, column string, query Query) string {
	if query.Alias == "" {
		return buildFrameNameFromQuery(row, column)
	}
	nameSegment := strings.Split(row.Name, ".")

	result := legendFormat.ReplaceAllFunc([]byte(query.Alias), func(in []byte) []byte {
		aliasFormat := string(in)
		aliasFormat = strings.Replace(aliasFormat, "[[", "", 1)
		aliasFormat = strings.Replace(aliasFormat, "]]", "", 1)
		aliasFormat = strings.Replace(aliasFormat, "$", "", 1)

		if aliasFormat == "m" || aliasFormat == "measurement" {
			return []byte(query.Measurement)
		}
		if aliasFormat == "col" {
			return []byte(column)
		}

		pos, err := strconv.Atoi(aliasFormat)
		if err == nil && len(nameSegment) > pos {
			return []byte(nameSegment[pos])
		}

		if !strings.HasPrefix(aliasFormat, "tag_") {
			return in
		}

		tagKey := strings.Replace(aliasFormat, "tag_", "", 1)
		tagValue, exist := row.Tags[tagKey]
		if exist {
			return []byte(tagValue)
		}

		return in
	})

	return string(result)
}

func buildFrameNameFromQuery(row Row, column string) string {
	tags := make([]string, 0, len(row.Tags))
	for k, v := range row.Tags {
		tags = append(tags, fmt.Sprintf("%s: %s", k, v))
	}

	tagText := ""
	if len(tags) > 0 {
		tagText = fmt.Sprintf(" { %s }", strings.Join(tags, " "))
	}

	return fmt.Sprintf("%s.%s%s", row.Name, column, tagText)
}

func parseTimestamp(value interface{}) (time.Time, error) {
	timestampNumber, ok := value.(json.Number)
	if !ok {
		return time.Time{}, fmt.Errorf("timestamp-value has invalid type: %#v", value)
	}
	timestampInMilliseconds, err := timestampNumber.Int64()
	if err != nil {
		return time.Time{}, err
	}

	// currently in the code the influxdb-timestamps are requested with
	// milliseconds-precision, meaning these values are milliseconds
	t := time.UnixMilli(timestampInMilliseconds).UTC()

	return t, nil
}

func typeof(values [][]interface{}, colIndex int) string {
	for _, value := range values {
		if value != nil && value[colIndex] != nil {
			return fmt.Sprintf("%T", value[colIndex])
		}
	}
	return "null"
}

func parseNumber(value interface{}) *float64 {
	// NOTE: we use pointers-to-float64 because we need
	// to represent null-json-values. they come for example
	// when we do a group-by with fill(null)

	if value == nil {
		// this is what json-nulls become
		return nil
	}

	number, ok := value.(json.Number)
	if !ok {
		// in the current inmplementation, errors become nils
		return nil
	}

	fvalue, err := number.Float64()
	if err != nil {
		// in the current inmplementation, errors become nils
		return nil
	}

	return &fvalue
}
