export const emptyFormSchema = {
  display: "form",
  components: [
    { type: "textfield", key: "name", label: "Name", input: true },
    { type: "email", key: "email", label: "E-Mail", input: true },
    { type: "button", action: "submit", label: "Absenden", theme: "primary" }
  ]
};
