export var PassType;
(function (PassType) {
    PassType[PassType["Render"] = 0] = "Render";
    PassType[PassType["PostProcessing"] = 1000] = "PostProcessing";
    PassType[PassType["GizmoRender"] = 2000] = "GizmoRender";
    PassType[PassType["Outline"] = 3000] = "Outline";
    PassType[PassType["Output"] = 4000] = "Output";
    PassType[PassType["Antialiasing"] = 5000] = "Antialiasing";
})(PassType || (PassType = {}));
