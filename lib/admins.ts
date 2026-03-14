export const ADMINS: { username: string; passwordHash: string }[] = [
  {
    username: "admin",
    // Password: republic2024
    passwordHash:
      "$2a$10$rOzOiIe4WR7a/X1H4s2wAOjXHf0uOrxFKXqmKfYuH3MSI.Y9hbNDy",
  },
];

export const JWT_SECRET =
  process.env.JWT_SECRET || "change-this-secret-in-env";
