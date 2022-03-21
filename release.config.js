/* eslint-disable no-template-curly-in-string */

module.exports = {
  branches: ["master"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
      },
    ],
    [
      "@semantic-release/exec", // set changelog file for electron release
      {
        shell: "echo ${nextRelease.notes} >> build/release-notes.md",
      },
    ],
    [
      "@semantic-release/npm", // set package.json version
      {
        npmPublish: false,
      },
    ],
    [
      "@semantic-release/git", // send a commit and tag
      {
        assets: ["package.json", "package-lock.json", "CHANGELOG.md"],
        message:
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
  ],
};
