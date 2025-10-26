document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value.trim();

    // regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

    if (!emailRegex.test(email)) {
      alert(`Enter a valid email.`);
      return;
    }

    if (!passwordRegex.test(password)) {
      alert("Incorrect Password!");
      return;
    }

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const response = await res.json();
      alert(response.message);

      if (response.success) {
        // Use the redirect URL from server response
        window.location.href = response.redirect;
        console.log(response.customer);
      } else {
        alert("Login failed. Please check your email or password.");
      }
    } catch (err) {
      console.log(`Failed to login: ${err}`);
      alert("Something went wrong. Try again later.");
    }
  });
