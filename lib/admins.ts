// ============================================================
// ADMIN ACCOUNTS — Add new admins here
// Password is stored as a bcrypt hash.
//
// To generate a hash for a new password, run:
//   node -e "const b=require('bcryptjs');b.hash('yourpassword',10).then(console.log)"
//
// Or use an online bcrypt generator (cost factor 10).
//
// FORMAT:
//   { username: "name", passwordHash: "$2a$10$..." }
// ============================================================

export const ADMINS: { username: string; passwordHash: string }[] = [
  {
    username: "admin",
    // Default password: "republic2024"  <-- CHANGE THIS
    passwordHash:
      "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
  },
  // Add more admins below:
  // {
  //   username: "alice",
  //   passwordHash: "$2a$10$...",
  // },
];

export const JWT_SECRET =
  process.env.JWT_SECRET || "change-this-secret-in-env";
