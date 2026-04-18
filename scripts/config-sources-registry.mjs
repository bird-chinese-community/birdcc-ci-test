const configSourceSort = (left, right) => left.id.localeCompare(right.id);

const assertValidSource = (source) => {
  if (
    !source.id ||
    !source.path ||
    !source.dest ||
    !source.entry ||
    !source.repo ||
    !source.repoGit ||
    !source.defaultBranch ||
    !source.licenseSpdx ||
    !source.birdMajor ||
    !Array.isArray(source.copy) ||
    source.copy.length === 0
  ) {
    throw new Error(`Invalid config source definition: ${JSON.stringify(source)}`);
  }

  return source;
};

export const configSources = [
  {
    id: "bird2-net186-config",
    path: "net186",
    dest: "configs/net186",
    entry: "bird.conf",
    repo: "186526/net186-config",
    repoGit: "https://github.com/186526/net186-config.git",
    defaultBranch: "main",
    licenseSpdx: "NOASSERTION",
    birdMajor: 2,
    copy: [
      { from: "bird.conf", to: "bird.conf" },
      { from: "config-example.conf", to: "config-example.conf" },
      { from: "bird/", to: "bird/" },
      { from: "lib/", to: "lib/" },
      { from: "protocol/", to: "protocol/" },
      { from: "util/", to: "util/" },
    ],
    localAdjustments: [
      "Copy config-example.conf to config.conf for runnable CI snapshot.",
      'Enable include "./config.conf" in bird.conf.',
    ],
  },
  {
    id: "bird2-sunyznet-bird-config",
    path: "sunyznet",
    dest: "configs/sunyznet",
    entry: "bird.conf",
    repo: "SunyzNET/bird-config",
    repoGit: "https://github.com/SunyzNET/bird-config.git",
    defaultBranch: "main",
    licenseSpdx: "MIT",
    birdMajor: 2,
    copy: [
      { from: "bird.conf", to: "bird.conf" },
      { from: "loader.conf", to: "loader.conf" },
      { from: "constant.conf", to: "constant.conf" },
      { from: "community.conf", to: "community.conf" },
      { from: "custom.conf", to: "custom.conf" },
      { from: "downstream.conf", to: "downstream.conf" },
      { from: "filter.conf", to: "filter.conf" },
      { from: "irr.conf", to: "irr.conf" },
      { from: "protocol.conf", to: "protocol.conf" },
      { from: "rpki.conf", to: "rpki.conf" },
      { from: "template.conf", to: "template.conf" },
      { from: "util.conf", to: "util.conf" },
    ],
    localAdjustments: [],
  },
  {
    id: "bird3-bird-configs-output-nycm1",
    path: "bird3/nycm1",
    dest: "configs/bird3/nycm1",
    entry: "bird.conf",
    repo: "tianshome/bird-configs-output",
    repoGit: "https://github.com/tianshome/bird-configs-output.git",
    defaultBranch: "main",
    licenseSpdx: "NOASSERTION",
    birdMajor: 3,
    copy: [{ from: "nycm1/bird.conf", to: "bird.conf" }],
    localAdjustments: [
      "Normalize placeholder `source address ...` lines to end with `;` for direct parse smoke.",
    ],
  },
].map(assertValidSource);

export const sortedConfigSources = [...configSources].sort(configSourceSort);
