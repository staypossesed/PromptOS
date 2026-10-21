const React = require("react");
function Link({ href, children, ...props }) {
  return React.createElement("a", { href: typeof href === "string" ? href : href?.pathname ?? "#", ...props }, children);
}
module.exports = Link;
module.exports.default = Link;
