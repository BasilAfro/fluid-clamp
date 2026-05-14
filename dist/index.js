"use strict";
/**
 * index.ts
 * Public API of the fluid-clamp package.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SPACE_SCALE = exports.DEFAULT_TYPE_SCALE = exports.fluidPlugin = exports.createFluidPlugin = exports.isFluidUnit = exports.fluidClamp = void 0;
var fluid_1 = require("./fluid");
Object.defineProperty(exports, "fluidClamp", { enumerable: true, get: function () { return fluid_1.fluidClamp; } });
Object.defineProperty(exports, "isFluidUnit", { enumerable: true, get: function () { return fluid_1.isFluidUnit; } });
var plugin_1 = require("./plugin");
Object.defineProperty(exports, "createFluidPlugin", { enumerable: true, get: function () { return plugin_1.createFluidPlugin; } });
Object.defineProperty(exports, "fluidPlugin", { enumerable: true, get: function () { return plugin_1.fluidPlugin; } });
var defaults_1 = require("./defaults");
Object.defineProperty(exports, "DEFAULT_TYPE_SCALE", { enumerable: true, get: function () { return defaults_1.DEFAULT_TYPE_SCALE; } });
Object.defineProperty(exports, "DEFAULT_SPACE_SCALE", { enumerable: true, get: function () { return defaults_1.DEFAULT_SPACE_SCALE; } });
//# sourceMappingURL=index.js.map