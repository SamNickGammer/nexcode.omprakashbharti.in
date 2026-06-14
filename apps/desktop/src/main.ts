// NexCode entry point: boot the VSCode workbench, then load default extensions.
// (start.ts uses top-level await, so it fully initializes before extensions
// register against the running services.)
import "./workbench/start";
import "./workbench/extensions";
