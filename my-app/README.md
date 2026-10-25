# Meridian Internship Credentials

A simple internship-certificate portal built with Next.js. Applicants can submit their internship details, an admin can approve or decline each request, and approved requests receive a certificate ID and a scannable QR code.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Workflow

1. Submit an application with your name, email, domain, duration, mode, and internship dates.
2. Open **Admin** to review, approve, or decline applications.
3. Approved applicants can open **My certificates** and choose **Download certificate**. In the print dialog, select **Save as PDF**.
4. Scan the QR code or enter the certificate ID in **Verify** to view the public certificate details.

## Prototype storage and security

This starter stores applications in the current browser's `localStorage`. It is intended for a single-browser demo: records do not sync across devices or browsers, and the Admin view is not protected by authentication. As a result, a QR code can only verify a record in a browser that has that record saved.

Before using this for real applicants or public verification, connect a shared database and add authenticated applicant/admin access. The QR URL already uses the current app origin and a certificate ID, so it can point to a shared verification page once that backend is added.
