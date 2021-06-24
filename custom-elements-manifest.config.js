import fs from 'fs';
import commentParser from 'comment-parser';

const packageData = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const { name, description, version, author, homepage, license } = packageData;

export default {
  globs: ['src/components/**/*.ts'],
  exclude: ['**/*.test.ts'],
  dev: true,
  watch: true,
  plugins: [
    // Append package data
    {
      name: 'shoelace-package-data',
      packageLinkPhase({ customElementsManifest, context }) {
        customElementsManifest.package = { name, description, version, author, homepage, license };
      }
    },
    // Parse custom jsDoc tags
    {
      name: 'shoelace-custom-tags',
      analyzePhase({ ts, node, moduleDoc, context }) {
        switch (node.kind) {
          case ts.SyntaxKind.ClassDeclaration:
            const hasDefaultModifier = node?.modifiers?.some(mod => ts.SyntaxKind.DefaultKeyword === mod.kind);
            const className = hasDefaultModifier ? 'default' : node?.name?.getText();
            const classDoc = moduleDoc?.declarations?.find(declaration => declaration.name === className);
            const customTags = ['animation', 'dependency', 'since', 'status'];
            let customComments = '/**';

            node.jsDoc?.forEach(jsDoc => {
              jsDoc?.tags?.forEach(tag => {
                const tagName = tag.tagName.getText();

                if (customTags.includes(tagName)) {
                  customComments += `\n * @${tagName} ${tag.comment}`;
                }
              });
            });

            const parsed = commentParser.parse(customComments + '\n */');
            parsed[0].tags?.map(t => {
              switch (t.tag) {
                case 'since':
                case 'status':
                  classDoc[t.tag] = t.name;
                  break;

                case 'dependency':
                  if (!Array.isArray(classDoc['dependencies'])) {
                    classDoc['dependencies'] = [];
                  }
                  classDoc['dependencies'].push(t.name);
                  break;

                // All other tags
                default:
                  if (!Array.isArray(classDoc[t.tag])) {
                    classDoc[t.tag] = [];
                  }

                  classDoc[t.tag].push({
                    name: t.name,
                    description: t.description,
                    type: t.type || undefined
                  });
              }
            });
        }
      }
    }
  ]
};
