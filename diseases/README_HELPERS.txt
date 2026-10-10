
# LUMIA Helpers (drop-in)

Files:
- mm-therapy-helper.js
- mds-helper.js
- cmml-helper.js
- aml-helper.js
- fil-fitness-helper.js

How to use:
1) Ensure your landing/modal loader listens to `window.LumiaHelpersRegistry`.
2) Load any of these scripts (defer) after your registry is ready.
3) When you open a helper, create a container DIV and call `registry.byId[ID].mount(container)`.

IDs:
- 'mm-helper', 'mds-helper', 'cmml-helper', 'aml-helper', 'fil-fitness-helper'

Each helper exposes metadata (title, version, tags, references) and `sections`
with either `html`, `blocks`, or a `table` primitive.
