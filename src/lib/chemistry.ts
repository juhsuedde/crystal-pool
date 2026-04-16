// Pool chemistry helpers
export const TARGETS = {
  ph: { min: 7.2, max: 7.6, ideal: 7.4 },
  chlorine: { min: 1, max: 3, ideal: 2 },
  alkalinity: { min: 80, max: 120, ideal: 100 },
};

export const STATUS_LABEL: Record<string, string> = {
  crystal: "Crystal Blue",
  warning: "Needs Attention",
  critical: "Critical",
  algae: "Algae Detected",
  cloudy: "Cloudy",
  offline: "No Data",
};

export const STATUS_COLOR: Record<string, string> = {
  crystal: "status-crystal",
  warning: "status-warning",
  critical: "status-critical",
  algae: "status-algae",
  cloudy: "status-cloudy",
  offline: "muted-foreground",
};
