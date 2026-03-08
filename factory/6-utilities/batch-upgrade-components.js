import fs from 'fs';
import path from 'path';

const COMPONENTS = [
    { name: 'EditableText.jsx', path: 'factory/2-templates/boilerplate/docked/shared/components/EditableText.jsx' },
    { name: 'EditableLink.jsx', path: 'factory/2-templates/boilerplate/docked/shared/components/EditableLink.jsx' }
];

function getAllComponentFiles(dir, componentName, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            getAllComponentFiles(filePath, componentName, fileList);
        } else if (file === componentName) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const sitesDir = path.join(process.cwd(), 'sites');
const sitetypesDir = path.join(process.cwd(), 'factory/3-sitetypes/docked');

COMPONENTS.forEach(comp => {
    console.log('🔍 Processing ' + comp.name + '...');
    const content = fs.readFileSync(comp.path, 'utf8');
    const files = [
        ...getAllComponentFiles(sitesDir, comp.name),
        ...getAllComponentFiles(sitetypesDir, comp.name)
    ];
    
    files.forEach(file => {
        const parentDir = path.dirname(file);
        if (fs.existsSync(path.join(parentDir, 'VisualEditor.jsx'))) return;
        try {
            fs.writeFileSync(file, content);
            console.log('  ✅ Upgraded: ' + path.relative(process.cwd(), file));
        } catch(e) { console.error('  ❌ Error: ' + file); }
    });
});
console.log('✨ Batch upgrade complete!');
