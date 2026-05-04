import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const releaseWorkflow = readFileSync(".github/workflows/release.yml", "utf8");

const version = packageJson.version;
const rootLockPackage = packageLock.packages?.[""];
const stableSemverPattern = /^\d+\.\d+\.\d+$/;
const rcSemverPattern = /^\d+\.\d+\.\d+-rc\.\d+$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (packageJson.name !== "@pyyush/useid") {
  fail(`Expected package name @pyyush/useid, got ${packageJson.name}`);
}

if (packageLock.name !== packageJson.name) {
  fail(
    `package-lock.json top-level name ${packageLock.name} does not match ${packageJson.name}`,
  );
}

if (packageLock.version !== version) {
  fail(
    `package-lock.json top-level version ${packageLock.version} does not match ${version}`,
  );
}

if (rootLockPackage?.name !== packageJson.name) {
  fail(
    `package-lock.json root package name ${rootLockPackage?.name} does not match ${packageJson.name}`,
  );
}

if (rootLockPackage?.version !== version) {
  fail(
    `package-lock.json root package version ${rootLockPackage?.version} does not match ${version}`,
  );
}

if (!stableSemverPattern.test(version) && !rcSemverPattern.test(version)) {
  fail(
    `Version ${version} must be stable x.y.z or RC x.y.z-rc.N before release verification`,
  );
}

if (!releaseWorkflow.includes("npm publish --access public --provenance --tag")) {
  fail("release.yml must publish with an explicit npm dist-tag");
}

if (!releaseWorkflow.includes("github_prerelease")) {
  fail("release.yml must mark RC GitHub releases as prereleases");
}

console.log(`Release policy check passed for ${packageJson.name}@${version}.`);
