# TenderPack AI

**TenderPack AI** is a browser-based tender document package builder that helps users organize, validate, and generate a complete tender submission package from a `requirements.json` file and PDF documents.


## Features

* Load tender requirements from `requirements.json`
* English and বাংলা language support
* Upload multiple PDF documents
* Drag-and-drop PDF upload
* Display uploaded file information
* Support up to **30 PDF files**
* Maximum total upload size of **50 MB**
* Match uploaded PDFs to tender requirements
* Prevent one PDF from being used for multiple requirements
* Check document requirements and missing items
* Handle expiry-date requirements
* Detect duplicate documents based on file content
* Generate a combined tender package PDF
* Include a cover page and page numbers
* Keep document processing inside the browser

## How It Works

### 1. Load Requirements

Upload the `requirements.json` file provided for the tender.

The application reads the tender information and required documents from the file.

### 2. Upload Documents

Upload the PDF documents that will be included in the tender package.

You can drag and drop PDFs or browse for files.

**Limits:**

* Maximum 30 files
* Maximum 50 MB total
* PDF files only

### 3. Match & Check

Match each uploaded PDF with the appropriate tender requirement.

TenderPack AI checks the package for missing or incomplete requirements and identifies documents that need attention.

### 4. Generate Package

Once all blocking issues are resolved, generate the final tender submission package.

The generated package contains:

* Cover page
* Tender information
* Required documents in the correct order
* Page numbering

## Privacy

TenderPack AI processes uploaded documents directly in the browser.

**Your files never leave your computer.**

No backend server or document storage is required for processing the tender documents.

## Technology

* React
* TypeScript
* Vite
* Tailwind CSS
* PDF processing in the browser
* Vercel deployment



## Project Goal

TenderPack AI was created for the **AI DevFest — Tender Document Package Builder** challenge.

The goal is to make tender submission preparation faster, easier, and less error-prone by providing a simple workflow for:

**Requirements → Upload → Match & Check → Generate**

## License

This project is licensed under the **MIT License**.

See the `LICENSE` file for details.

---

**TenderPack AI** — Tender submission packages, prepared in your browser.
