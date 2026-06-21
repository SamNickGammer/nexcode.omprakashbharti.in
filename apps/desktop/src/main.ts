// NexCode entry point: boot the VSCode workbench, apply NexCode branding,
// register workspace commands, then load default extensions. (start.ts uses
// top-level await, so the workbench is fully initialized before the rest run.)
import "./workbench/start";
import "./workbench/brand";
import { initFolderCommands } from "./workbench/openFolder";
import "./workbench/extensions";

void initFolderCommands();
