// NexCode entry point: boot the VSCode workbench, apply NexCode branding, then
// load default extensions. (start.ts uses top-level await, so the workbench is
// fully initialized before branding/extensions run.)
import "./workbench/start";
import "./workbench/brand";
import "./workbench/extensions";
