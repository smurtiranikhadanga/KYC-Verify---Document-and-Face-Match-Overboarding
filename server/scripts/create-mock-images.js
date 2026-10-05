import fs from 'fs';
import path from 'path';

// Valid 1x1 base64 JPEG
const base64Jpeg = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const buffer = Buffer.from(base64Jpeg, 'base64');

const mockDir = path.resolve('uploads', 'mock');
if (!fs.existsSync(mockDir)) {
  fs.mkdirSync(mockDir, { recursive: true });
}

fs.writeFileSync(path.join(mockDir, 'id-front.jpg'), buffer);
fs.writeFileSync(path.join(mockDir, 'id-back.jpg'), buffer);
fs.writeFileSync(path.join(mockDir, 'selfie.jpg'), buffer);

console.log('Mock images created successfully in', mockDir);
