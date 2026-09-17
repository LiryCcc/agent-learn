const requiredNodeMajorVersion = 26;
const currentNodeMajorVersion = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10);

if (currentNodeMajorVersion !== requiredNodeMajorVersion) {
  console.error(`Node.js ${String(requiredNodeMajorVersion)} is required. Current version: ${process.versions.node}.`);
  process.exitCode = 1;
} else {
  console.log(`Node.js ${process.versions.node} is supported.`);
}
