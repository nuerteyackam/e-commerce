// Function to check if user is logged in
async function isLoggedIn() {
  try {
    const res = await fetch("/login/me");
    const data = await res.json();
    return data.loggedIn || false;
  } catch (err) {
    console.error("Error checking login status:", err);
    return false;
  }
}

// Function to check if user has admin privileges
async function isAdmin() {
  try {
    const res = await fetch("/login/me");
    const data = await res.json();
    if (data.loggedIn && data.user && data.user.user_role === 1) {
      return true; 
    }
    return false;
  } catch (err) {
    console.error("Error checking admin status:", err);
    return false;
  }
}

// Function to get current user session data
async function getCurrentUser() {
  try {
    const res = await fetch("/login/me");
    return await res.json();
  } catch (err) {
    console.error("Error getting user data:", err);
    return { loggedIn: false };
  }
}