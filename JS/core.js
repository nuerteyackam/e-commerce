// Function to check if user is logged in
async function isLoggedIn() {
  try {
    const res = await fetch("/login/me");
    const data = await res.json();
    return (data.success && data.loggedIn) || false;
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

    // Check if user is logged in and has admin role
    if (
      data.success &&
      data.loggedIn &&
      data.data &&
      data.data.user_role === 1
    ) {
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
    return { success: false, loggedIn: false };
  }
}

// Function to update cart count display
async function updateCartCountDisplay() {
  try {
    const response = await fetch("/get-cart", {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      // Use cartCount instead of itemCount
      const cartCount = data.data?.cartCount || 0;
      const cartCountEl = document.getElementById("nav-cart-count");
      if (cartCountEl) {
        cartCountEl.textContent = cartCount;
      }
    }
  } catch (error) {
    console.error("Error updating cart count:", error);
    const cartCountEl = document.getElementById("nav-cart-count");
    if (cartCountEl) {
      cartCountEl.textContent = "0";
    }
  }
}

// Initialize cart count when page loads
async function initializeCartCount() {
  await updateCartCountDisplay();
}

// Function to update navigation UI with user info
async function updateNavigationUI() {
  try {
    const userData = await getCurrentUser();

    const navUserName = document.getElementById("nav-user-name");
    const navLogin = document.getElementById("nav-login");
    const navLogoutBtn = document.getElementById("nav-logout-btn");

    // Check for correct properties from your API response
    if (userData.success && userData.loggedIn && userData.data) {
      // User is logged in
      if (navUserName) {
        navUserName.textContent =
          userData.data.name || userData.data.email || "User";
      }
      if (navLogin) {
        navLogin.style.display = "none";
      }
      if (navLogoutBtn) {
        navLogoutBtn.style.display = "inline-block";
        navLogoutBtn.onclick = async () => {
          try {
            await fetch("/logout", {
              method: "POST",
              credentials: "include",
            });
            window.location.href = "/";
          } catch (error) {
            console.error("Logout error:", error);
          }
        };
      }
    } else {
      // User is not logged in
      if (navUserName) {
        navUserName.textContent = "Guest";
      }
      if (navLogin) {
        navLogin.style.display = "inline-block";
      }
      if (navLogoutBtn) {
        navLogoutBtn.style.display = "none";
      }
    }
  } catch (error) {
    console.error("Error updating navigation:", error);
  }
}

// Initialize when DOM is loaded
// Update your core.js DOMContentLoaded event:
document.addEventListener("DOMContentLoaded", async () => {
  const isCheckoutPage =
    window.location.pathname === "/checkout" ||
    window.location.pathname === "/paystack-callback";

  // Update cart count if cart element exists and not on checkout page
  if (document.getElementById("nav-cart-count") && !isCheckoutPage) {
    await initializeCartCount();
  }

  // Update user navigation if user elements exist
  if (document.getElementById("nav-user-name")) {
    await updateNavigationUI();
  }

  console.log("Core.js navigation initialized");
});
