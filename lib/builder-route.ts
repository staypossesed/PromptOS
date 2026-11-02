// Existing pack/template and checkout-resume journeys keep their established builder.
export function isClassicBuilderRoute(params: Pick<URLSearchParams, "has">): boolean {
  return ["template", "pack", "mode", "resume"].some(key => params.has(key));
}
