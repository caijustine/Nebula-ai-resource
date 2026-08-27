# Resource Link Page - Project Specification

## Overview

Build a web application that allows users to submit educational or helpful resource links for a class. Visitors should be able to browse all submitted resources and click links to visit them.

The application should prioritize simplicity and ease of use. No authentication or user accounts are required.

---

# Tech Stack

## Frontend

- React
- TypeScript
- React Router (recommended)
- Prefer Tailwind CSS for styling where possible

## Database (Recommended)

One of the following:

- PostgreSQL
- JSON file storage (acceptable for MVP)

---

# Core Features

## 1. Resource Submission Form

Users should be able to submit a resource through a form.

### Minimum Required Fields

| Field | Type     | Required |
| ----- | -------- | -------- |
| Title | Text     | Yes      |
| URL   | URL/Text | Yes      |

### Optional Fields

| Field          | Type          |
| -------------- | ------------- |
| Description    | Textarea      |
| Category       | Dropdown/Text |
| Tags           | Text          |
| Submitter Name | Text          |

### Validation Requirements

- Title cannot be empty
- URL must be a valid URL
- Prevent blank submissions
- Show user-friendly validation errors

### Submission Behavior

After submission:

- Save the resource
- Show success feedback
- Clear the form
- Newly submitted resources should appear in the resource list

---

## 2. Resource Listing Page

Visitors should be able to browse all submitted resources.

### Display Requirements

Each resource card/list item should display:

- Title
- URL or clickable button/link
- Optional description
- Optional category/tags
- Submission timestamp (recommended)

### Interaction Requirements

- Clicking a resource opens the link
- External links should open in a new tab

### Sorting (Recommended)

Sort resources by:

- Newest first

## 3. Hosting

This project should be compatible with Railway.
