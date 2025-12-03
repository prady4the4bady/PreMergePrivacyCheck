// Test file with fake secrets for demonstration
// This file is safe to commit as it contains fake/test data

const config = {
  // Fake AWS credentials (should be detected)
  awsAccessKey: "AKIAIOSFODNN7EXAMPLE",
  awsSecretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",

  // Fake GitHub token (should be detected)
  githubToken: "ghp_1234567890abcdef1234567890abcdef12345678",

  // Fake email (should be detected)
  adminEmail: "admin@company.com",

  // Fake phone number (should be detected)
  supportPhone: "555-123-4567",

  // Fake SSN (should be detected as critical)
  testSSN: "123-45-6789",

  // Fake credit card (should be detected as critical)
  testCard: "4111111111111111",

  // Safe data (should not be detected)
  apiVersion: "v1.0.0",
  environment: "development",
  debugMode: true
};

module.exports = config;