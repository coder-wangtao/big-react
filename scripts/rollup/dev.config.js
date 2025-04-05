import reactDomConfig from "./react-dom.config.js";
import reactConfig from "./react.config.js";
import reactNoopRendererConfig from "./react-noop-renderer.config";

export default () => {
  return [...reactConfig, ...reactDomConfig, ...reactNoopRendererConfig];
};
