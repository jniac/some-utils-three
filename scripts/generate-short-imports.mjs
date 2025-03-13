import fs from "fs/promises"
import path from "path"

/**
 * Recursively scans a directory for `index.js` files and creates corresponding `path.js` files.
 * @param {string} dir - The root directory to scan.
 */
export async function generateShortImports(dir) {
  const items = await fs.readdir(dir, { withFileTypes: true })

  for (const item of items) {
    const fullPath = path.join(dir, item.name)

    if (item.isDirectory()) {
      // Check if `index.js` exists in this directory
      const indexPath = path.join(fullPath, "index.js")

      try {
        await fs.access(indexPath) // Check if index.js exists

        // Get the relative path from the base dir
        const relativePath = path.relative(dir, fullPath)

        // Create the re-export file (`path.js`)
        const exportFilePath = path.join(dir, `${relativePath}.js`)
        const exportContent = `export * from './${relativePath}/index.js';\n`

        // Write the re-export file
        await fs.writeFile(exportFilePath, exportContent)
        console.log(`✅ Created: ${exportFilePath}`)
      } catch {
        // No index.js found, continue without creating a file
      }

      // Recursively process subdirectories
      await generateShortImports(fullPath)
    }
  }
}

// Run the script in the `dist/` directory (or wherever your compiled JS files are)
// const OUTPUT_DIR = "./dist" // Adjust this if needed
// await generateShortImports(OUTPUT_DIR)
// console.log("🎉 Short import files generated successfully!")