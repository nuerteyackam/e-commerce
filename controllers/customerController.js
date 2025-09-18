import Customer from "../model/customer.js";

export async function registerCustomerCtr(data) {
  if (await Customer.checkEmailExists(data.email)) {
    throw new Error("Email already exists");
  }
  return await Customer.addCustomer(data);
}

export async function updateCustomer(id, data) {
  const updatedCustomer = await Customer.editCustomer(id, data);

  if (!updatedCustomer) {
    throw new Error("Update failed!");
  }
  return updatedCustomer;
}

export async function deleteCustomerCtr(id) {
  const deletedCustomer = await Customer.deleteCustomer(id);
  if (!deletedCustomer) {
    throw new Error("Customer not found!");
  }
  return deletedCustomer;
}
