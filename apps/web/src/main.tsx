import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@formio/js/dist/formio.full.min.css";
import "@formio/js/dist/formio.builder.min.css";
import "./styles.css";
import "./oblique-theme.css";
import { AppShell } from "./ui/AppShell";
import { DashboardPage } from "./ui/DashboardPage";
import { FormEditorPage } from "./ui/FormEditorPage";
import { PublicFormPage } from "./ui/PublicFormPage";
import { SubmissionsPage } from "./ui/SubmissionsPage";
import { TestStatusPage } from "./ui/TestStatusPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "system/tests", element: <TestStatusPage /> },
      { path: "projects/:projectId/forms/:formId", element: <FormEditorPage /> },
      { path: "projects/:projectId/forms/:formId/submissions", element: <SubmissionsPage /> }
    ]
  },
  { path: "/f/:publicSlug", element: <PublicFormPage /> }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
