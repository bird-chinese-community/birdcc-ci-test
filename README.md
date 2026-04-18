# birdcc-ci-test

> **A public CI test ground for [`bird-chinese-community/setup-birdcc`](https://github.com/bird-chinese-community/setup-birdcc).**

This repository contains real-world BIRD2 config files and GitHub Actions workflows that exercise the `setup-birdcc` action across different scenarios. It acts as a live integration test for the action's lint, format-check, and changed-file detection features.

## Config files

The BIRD2 configuration in this repo is adapted from [SunyzNET/bird-config](https://github.com/SunyzNET/bird-config) (MIT) and trimmed for testing purposes. It is **not intended for production use**.

```
bird.conf          # entry point — includes all other files
constant.conf      # router ID, define constants
community.conf     # BGP community definitions
custom.conf        # custom per-site settings
downstream.conf    # downstream peer filters
filter.conf        # import/export filters
irr.conf           # IRR-based prefix filters
loader.conf        # include orchestrator
protocol.conf      # BGP/static/kernel protocol blocks
rpki.conf          # RPKI ROA table
template.conf      # BGP peer templates
util.conf          # utility functions
```

## CI workflows

| Workflow | Trigger | What it tests |
|---|---|---|
| [`lint.yml`](.github/workflows/lint.yml) | push / PR | `birdcc lint bird.conf --bird` with a live BIRD2 binary |
| [`format.yml`](.github/workflows/format.yml) | push / PR | `birdcc fmt bird.conf --check` (no BIRD binary needed) |
| [`changed-files.yml`](.github/workflows/changed-files.yml) | PR (`.conf` / `.bird` paths) | Lint only the files changed in a PR using `changed-config-files` output |

All workflows use `bird-chinese-community/setup-birdcc@main` to test the latest revision of the action directly.

## How to use as a reference

If you are adding a new feature or fixing a bug in `setup-birdcc`, open a PR against **this** repo to reproduce the problem or verify the fix in real CI — before updating the action itself.

## License

The workflow files are released under [MIT](LICENSE). The BIRD2 config files are adapted from [SunyzNET/bird-config](https://github.com/SunyzNET/bird-config) and used under their original license terms.
