// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     kinds/cog_gen.go
// Using jennies:
//     TypescriptRawTypes
//
// Run 'make gen-cue' from repository root to regenerate.

// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Using jennies:
//     TypescriptRawTypes

export interface Role {
	// The role identifier `managed:builtins:editor:permissions`
	name: string;
	// Optional display
	displayName?: string;
	// Name of the team.
	groupName?: string;
	// Role description
	description?: string;
	// Do not show this role
	hidden: boolean | false;
}

export const defaultRole = (): Role => ({
	name: "",
	hidden: false,
});

