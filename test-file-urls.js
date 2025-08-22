// Test script to verify file URL generation
const {
  simpleFileStorage,
} = require("./dist/server/utils/simpleFileStorage.js");


// Test cases that match your database paths
const testPaths = [
  "var/www/GI/registration_43/logo-small-indianGI_1755552902948.png",
  "var/www/GI/registration_43/aadhar_1234567890.jpg",
  "var/www/GI/registration_123/document_9876543210.pdf",
];

testPaths.forEach((path) => {
  const url = simpleFileStorage.getFileUrl(path);
 
});


