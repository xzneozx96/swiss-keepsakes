Seed fixture for detect.mjs: every file here holds a known violation of one bundle-* rule.
Run: node ../detect.mjs --root . --graph graph.json --dist dist --log build.log
Every rule must report at least one hit. graph.json is hand-written; <ROOT> is replaced by this folder.
