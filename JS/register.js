document
  .getElementById("registerForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = e.target;
    const fullname = form.fullname.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const country = form.country.value;
    const city = form.city.value.trim();
    const contact = form.contact.value.trim();

    //regex
    const nameRegex = /^[a-zA-Z\s]{3,50}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    const phoneRegex = /^[0-9]{7,15}$/;

    if (!nameRegex.test(fullname)) {
      alert("Full name must be 3-50 letters only.");
      return;
    }

    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!passwordRegex.test(password)) {
      alert(
        "Password must be at least 6 characters and contain both letters and numbers."
      );
      return;
    }
    if (!phoneRegex.test(contact)) {
      alert("Contact number must be 7-15 digits.");
      return;
    }
    if (!country || !city) {
      alert("Country and City are required.");
      return;
    }

    const data = { fullname, email, password, country, city, contact };

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const response = await res.json();
      alert(response.message);

      if (response.success) {
        window.location.href = "/login.html";
      }
    } catch (err) {
      console.log("Failed to register:", err);
      alert("Something went wrong!");
    }
  });
