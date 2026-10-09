// One-off data seed for the App and Profession config tables. Run with:
//   node prisma/seed.mjs
// Safe to re-run â€” every write is an upsert keyed by slug.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// slug -> real IntegrationProvider id, for the apps STACK can actually run
// OAuth for today. Everything else gets oauthProviderId: null ("Not yet
// supported") â€” still listed for personalization, never a fake Connect button.
const PROVIDER_MAP = {
  gmail: "google",
  "google-calendar": "google",
  "google-drive": "google",
  "google-workspace": "google",
  outlook: "microsoft",
  "outlook-calendar": "microsoft",
  onedrive: "microsoft",
  "microsoft-365": "microsoft",
  "microsoft-teams": "microsoft",
  slack: "slack",
  notion: "notion",
  github: "github",
  gitlab: "gitlab",
  dropbox: "dropbox",
  box: "box",
  jira: "jira",
  linear: "linear",
  figma: "figma",
  trello: "trello",
  asana: "asana",
  hubspot: "hubspot",
  salesforce: "salesforce",
  quickbooks: "quickbooks",
  shopify: "shopify",
  stripe: "stripe",
  // Connect with a token the person creates in the app (no developer app of ours needed).
  clickup: "clickup",
  "monday-com": "monday",
  calendly: "calendly",
  zendesk: "zendesk",
  intercom: "intercom",
  vercel: "vercel",
  netlify: "netlify",
  mailchimp: "mailchimp",
  greenhouse: "greenhouse",
  lever: "lever",
  gorgias: "gorgias",
  shipstation: "shipstation",
  bamboohr: "bamboohr",
  shippo: "shippo",
  clio: "clio",
  freshbooks: "freshbooks",
  cin7: "cin7",
  benchling: "benchling",
  servicenow: "servicenow",
  "shopify-pos": "shopify",
};

// name -> [category, description]. Used for every app referenced below,
// whether or not it has a real connector.
const APP_META = {
  GitHub: ["Development", "Code, repositories, and development work."],
  GitLab: ["Development", "Source control, CI/CD, and issue tracking."],
  "VS Code": ["Development", "Code editor â€” local, nothing to connect."],
  Jira: ["Development", "Issue tracking and agile project management."],
  Linear: ["Development", "Fast, focused issue tracking for software teams."],
  Slack: ["Communication", "Team messaging, channels, and DMs."],
  Vercel: ["Development", "Deployment and hosting for web projects."],
  Netlify: ["Development", "Deployment and hosting for web projects."],
  Figma: ["Design", "Collaborative interface design and prototyping."],
  Xcode: ["Development", "Apple's IDE â€” local, nothing to connect."],
  "Android Studio": ["Development", "Google's IDE â€” local, nothing to connect."],
  Firebase: ["Development", "Backend, auth, and database for apps."],
  Jupyter: ["Data & AI", "Interactive notebooks for code and analysis."],
  OpenAI: ["Data & AI", "AI models and APIs."],
  "Hugging Face": ["Data & AI", "Open models, datasets, and ML tooling."],
  AWS: ["Data & AI", "Cloud infrastructure and services."],
  Python: ["Data & AI", "Programming language â€” local, nothing to connect."],
  Databricks: ["Data & AI", "Unified data and AI analytics platform."],
  Snowflake: ["Data & AI", "Cloud data warehouse."],
  Tableau: ["Data & AI", "Data visualization and analytics."],
  Excel: ["Productivity", "Spreadsheets â€” local, nothing to connect."],
  SQL: ["Data & AI", "Query language â€” local, nothing to connect."],
  "Power BI": ["Data & AI", "Business analytics and reporting."],
  Looker: ["Data & AI", "Business intelligence and data exploration."],
  Splunk: ["Security & IT", "Log analysis and monitoring."],
  CrowdStrike: ["Security & IT", "Endpoint security and threat detection."],
  "Microsoft Sentinel": ["Security & IT", "Cloud-native SIEM and security analytics."],
  Wireshark: ["Security & IT", "Network protocol analyzer â€” local tool."],
  ServiceNow: ["Security & IT", "IT service management."],
  "Microsoft Intune": ["Security & IT", "Device and endpoint management."],
  TeamViewer: ["Security & IT", "Remote access and support."],
  Docker: ["Development", "Containerization platform."],
  Kubernetes: ["Development", "Container orchestration."],
  Jenkins: ["Development", "CI/CD automation server."],
  "Adobe XD": ["Design", "Interface design and prototyping."],
  Sketch: ["Design", "Interface design tool â€” local, nothing to connect."],
  FigJam: ["Design", "Online whiteboarding, built on Figma."],
  TestRail: ["Development", "Test case management."],
  Selenium: ["Development", "Browser automation for testing."],
  Postman: ["Development", "API testing and development."],
  QuickBooks: ["Finance", "Accounting, invoicing, and bookkeeping."],
  Xero: ["Finance", "Cloud accounting software."],
  NetSuite: ["Finance", "ERP and financial management."],
  FreshBooks: ["Finance", "Invoicing and accounting for small business."],
  Bloomberg: ["Finance", "Financial data, news, and analytics."],
  "Bloomberg Terminal": ["Finance", "Financial data, news, and analytics."],
  FactSet: ["Finance", "Financial data and analytics platform."],
  "Capital IQ": ["Finance", "Financial research and analytics."],
  ProSeries: ["Finance", "Professional tax preparation software."],
  UltraTax: ["Finance", "Professional tax preparation software."],
  "Drake Tax": ["Finance", "Professional tax preparation software."],
  CaseWare: ["Finance", "Audit and financial reporting software."],
  IDEA: ["Finance", "Data analysis for audit and fraud detection."],
  TeamMate: ["Finance", "Audit management software."],
  ADP: ["HR & People", "Payroll and HR management."],
  Paychex: ["HR & People", "Payroll and HR services."],
  Workday: ["HR & People", "HR, payroll, and finance management."],
  Guidewire: ["Finance", "Insurance underwriting and claims platform."],
  Encompass: ["Finance", "Mortgage loan origination software."],
  DocuSign: ["Productivity", "Electronic signatures and agreements."],
  Epic: ["Healthcare", "Electronic health records platform."],
  "Oracle Health": ["Healthcare", "Electronic health records platform."],
  athenahealth: ["Healthcare", "Cloud-based health records and billing."],
  Pyxis: ["Healthcare", "Medication and supply dispensing systems."],
  Dentrix: ["Healthcare", "Dental practice management software."],
  "Open Dental": ["Healthcare", "Dental practice management software."],
  Eaglesoft: ["Healthcare", "Dental practice management software."],
  PioneerRx: ["Healthcare", "Pharmacy management software."],
  PrimeRx: ["Healthcare", "Pharmacy management software."],
  "QS/1": ["Healthcare", "Pharmacy management software."],
  "3M": ["Healthcare", "Medical coding software and services."],
  Optum: ["Healthcare", "Health services and coding software."],
  Kareo: ["Healthcare", "Medical billing and practice management."],
  AdvancedMD: ["Healthcare", "Medical billing and practice management."],
  PACS: ["Healthcare", "Medical imaging storage and access."],
  Sectra: ["Healthcare", "Medical imaging (PACS) systems."],
  MEDITECH: ["Healthcare", "Electronic health records platform."],
  Clio: ["Legal", "Legal practice management."],
  LexisNexis: ["Legal", "Legal research database."],
  Westlaw: ["Legal", "Legal research database."],
  "Microsoft 365": ["Productivity", "Word, Excel, PowerPoint, Outlook, and Teams."],
  "Adobe Acrobat": ["Productivity", "PDF creation and editing."],
  "Bloomberg Law": ["Legal", "Legal research and news."],
  "Stenograph software": ["Legal", "Court reporting software."],
  "Case CATalyst": ["Legal", "Court reporting and transcription software."],
  LogicGate: ["Legal", "Risk and compliance management."],
  OneTrust: ["Legal", "Privacy, security, and compliance management."],
  Asana: ["Productivity", "Task and project management."],
  "Monday.com": ["Productivity", "Work management and team collaboration."],
  ClickUp: ["Productivity", "All-in-one project and task management."],
  "Google Workspace": ["Productivity", "Gmail, Calendar, Drive, and Docs."],
  BambooHR: ["HR & People", "HR management for small and mid-size teams."],
  "LinkedIn Recruiter": ["HR & People", "Candidate sourcing and recruiting."],
  Greenhouse: ["HR & People", "Applicant tracking and hiring."],
  Lever: ["HR & People", "Applicant tracking and recruiting CRM."],
  Salesforce: ["Sales & CRM", "Customer relationship management."],
  HubSpot: ["Sales & CRM", "CRM, marketing, and sales tools."],
  Outreach: ["Sales & CRM", "Sales engagement platform."],
  Gong: ["Sales & CRM", "Revenue intelligence and call analytics."],
  Gainsight: ["Sales & CRM", "Customer success management."],
  Zendesk: ["Sales & CRM", "Customer service and support tickets."],
  Gorgias: ["Sales & CRM", "Customer support built for e-commerce."],
  Intercom: ["Sales & CRM", "Customer messaging and support."],
  Calendly: ["Productivity", "Scheduling and meeting booking."],
  AutoCAD: ["Engineering", "2D and 3D CAD design software."],
  Revit: ["Engineering", "Building information modeling (BIM) software."],
  SketchUp: ["Engineering", "3D modeling software."],
  Rhino: ["Engineering", "3D modeling software."],
  "AutoCAD Civil 3D": ["Engineering", "Civil engineering design software."],
  ArcGIS: ["Engineering", "Geographic information system (GIS) software."],
  SolidWorks: ["Engineering", "3D CAD design software."],
  CATIA: ["Engineering", "3D CAD and product design software."],
  MATLAB: ["Engineering", "Numerical computing and simulation."],
  "AutoCAD Electrical": ["Engineering", "Electrical control design software."],
  Altium: ["Engineering", "PCB design software."],
  "SAP2000": ["Engineering", "Structural analysis and design software."],
  ETABS: ["Engineering", "Structural analysis for buildings."],
  Procore: ["Engineering", "Construction project management."],
  Bluebeam: ["Engineering", "PDF markup for construction documents."],
  PlanSwift: ["Engineering", "Construction takeoff and estimating."],
  Trimble: ["Engineering", "Surveying and geospatial hardware/software."],
  Samsara: ["Logistics", "Fleet tracking and telematics."],
  Omnitracs: ["Logistics", "Fleet management and dispatch."],
  Geotab: ["Logistics", "Fleet tracking and telematics."],
  SAP: ["Logistics", "Enterprise resource planning."],
  Oracle: ["Logistics", "Enterprise resource planning."],
  "Manhattan Associates": ["Logistics", "Supply chain and warehouse management."],
  Motive: ["Logistics", "Fleet management and telematics."],
  "Manhattan WMS": ["Logistics", "Warehouse management system."],
  ShipStation: ["Logistics", "Shipping label and order management."],
  Shippo: ["Logistics", "Shipping API and label management."],
  "FedEx systems": ["Logistics", "Shipping and package tracking."],
  "UPS systems": ["Logistics", "Shipping and package tracking."],
  Shopify: ["Sales & CRM", "E-commerce storefront and order management."],
  "Amazon Seller Central": ["Sales & CRM", "Amazon marketplace seller tools."],
  Klaviyo: ["Marketing", "Email and SMS marketing automation."],
  "Shopify POS": ["Sales & CRM", "In-person point of sale for Shopify."],
  Square: ["Sales & CRM", "Point of sale and payments."],
  Lightspeed: ["Sales & CRM", "Point of sale for retail."],
  Cin7: ["Logistics", "Inventory management."],
  Fishbowl: ["Logistics", "Inventory management."],
  MLS: ["Real Estate", "Multiple listing service for real estate."],
  Zillow: ["Real Estate", "Real estate listings and data."],
  "Realtor.com": ["Real Estate", "Real estate listings and data."],
  AppFolio: ["Real Estate", "Property management software."],
  Buildium: ["Real Estate", "Property management software."],
  Yardi: ["Real Estate", "Property management and real estate software."],
  Entrata: ["Real Estate", "Property management software."],
  CoStar: ["Real Estate", "Commercial real estate data and analytics."],
  Argus: ["Real Estate", "Real estate valuation and analysis."],
  Encompass2: ["Real Estate", "Mortgage loan origination software."],
  Photoshop: ["Design", "Image editing â€” local, nothing to connect."],
  Illustrator: ["Design", "Vector graphics â€” local, nothing to connect."],
  "Premiere Pro": ["Design", "Video editing â€” local, nothing to connect."],
  "DaVinci Resolve": ["Design", "Video editing â€” local, nothing to connect."],
  "Final Cut Pro": ["Design", "Video editing â€” local, nothing to connect."],
  Blender: ["Design", "3D creation suite â€” local, nothing to connect."],
  Maya: ["Design", "3D animation software â€” local, nothing to connect."],
  "Cinema 4D": ["Design", "3D motion design â€” local, nothing to connect."],
  "After Effects": ["Design", "Motion graphics â€” local, nothing to connect."],
  "FL Studio": ["Design", "Music production â€” local, nothing to connect."],
  Ableton: ["Design", "Music production â€” local, nothing to connect."],
  "Logic Pro": ["Design", "Music production â€” local, nothing to connect."],
  Lightroom: ["Design", "Photo editing â€” local, nothing to connect."],
  "Capture One": ["Design", "Photo editing â€” local, nothing to connect."],
  Nuke: ["Design", "VFX compositing â€” local, nothing to connect."],
  Houdini: ["Design", "VFX and procedural 3D â€” local, nothing to connect."],
  "Google Ads": ["Marketing", "Search and display advertising."],
  "Meta Ads": ["Marketing", "Facebook and Instagram advertising."],
  Semrush: ["Marketing", "SEO and competitive research."],
  Ahrefs: ["Marketing", "SEO research and backlink analysis."],
  "Google Search Console": ["Marketing", "Search performance monitoring."],
  Hootsuite: ["Marketing", "Social media scheduling and management."],
  Buffer: ["Marketing", "Social media scheduling."],
  "Sprout Social": ["Marketing", "Social media management and analytics."],
  Mailchimp: ["Marketing", "Email marketing automation."],
  "Google Analytics": ["Marketing", "Website traffic and behavior analytics."],
  WordPress: ["Marketing", "Website and content management."],
  Webflow: ["Marketing", "Visual website design and CMS."],
  Contentful: ["Marketing", "Headless content management."],
  R: ["Data & AI", "Statistical computing â€” local, nothing to connect."],
  SAS: ["Data & AI", "Statistical analysis software."],
  SPSS: ["Data & AI", "Statistical analysis software."],
  QGIS: ["Engineering", "Open-source GIS software â€” local tool."],
  LabArchives: ["Science & Research", "Electronic lab notebook."],
  Galaxy: ["Science & Research", "Bioinformatics workflow platform."],
  Bioconductor: ["Science & Research", "Bioinformatics tools â€” local/R packages."],
  LIMS: ["Science & Research", "Laboratory information management system."],
  LabWare: ["Science & Research", "Laboratory information management system."],
  Benchling: ["Science & Research", "R&D and lab data platform."],
  "Google Classroom": ["Education", "Classroom management and assignments."],
  Canvas: ["Education", "Learning management system."],
  Schoology: ["Education", "Learning management system."],
  PowerSchool: ["Education", "Student information system."],
  "Infinite Campus": ["Education", "Student information system."],
  "Articulate 360": ["Education", "Course authoring tools."],
  Moodle: ["Education", "Open-source learning management system."],
  Banner: ["Education", "Higher-ed student information system."],
  "Google Drive": ["Productivity", "Cloud file storage and sharing."],
  Dropbox: ["Productivity", "Cloud file storage and sharing."],
  OneDrive: ["Productivity", "Cloud file storage and sharing."],
  Box: ["Productivity", "Cloud file storage and sharing."],
  Notion: ["Productivity", "Docs, wikis, and notes."],
  Gmail: ["Communication", "Email."],
  Outlook: ["Communication", "Email and calendar."],
  "Google Calendar": ["Productivity", "Scheduling and calendar."],
  "Outlook Calendar": ["Productivity", "Scheduling and calendar."],
  "Microsoft Teams": ["Communication", "Team chat, calls, and meetings."],
  Zoom: ["Communication", "Video meetings and webinars."],
  Trello: ["Productivity", "Kanban-style task boards."],
  Stripe: ["Finance", "Payments and subscription billing."],
};

const professionCategories = {
  "Technology & Software": {
    "Software Developer": ["GitHub", "GitLab", "VS Code", "Jira", "Linear", "Slack"],
    "Web Developer": ["GitHub", "VS Code", "Vercel", "Netlify", "Figma"],
    "Mobile Developer": ["Xcode", "Android Studio", "GitHub", "Firebase"],
    "AI Engineer": ["GitHub", "Jupyter", "OpenAI", "Hugging Face", "AWS"],
    "Data Scientist": ["Python", "Jupyter", "Databricks", "Snowflake", "Tableau"],
    "Data Analyst": ["Excel", "SQL", "Tableau", "Power BI", "Looker"],
    "Cybersecurity Analyst": ["Splunk", "CrowdStrike", "Microsoft Sentinel", "Wireshark"],
    "IT Specialist": ["ServiceNow", "Jira", "Microsoft Intune", "TeamViewer"],
    "DevOps Engineer": ["GitHub", "Docker", "Kubernetes", "Jenkins", "AWS"],
    "UX/UI Designer": ["Figma", "Adobe XD", "Sketch", "FigJam"],
    "QA Tester": ["Jira", "TestRail", "Selenium", "Postman"],
  },
  "Finance & Accounting": {
    Accountant: ["QuickBooks", "Xero", "NetSuite", "Excel"],
    Bookkeeper: ["QuickBooks", "Xero", "FreshBooks"],
    "Financial Analyst": ["Excel", "Bloomberg", "Power BI", "Tableau"],
    "Investment Analyst": ["Bloomberg Terminal", "FactSet", "Capital IQ", "Excel"],
    "Tax Professional": ["ProSeries", "UltraTax", "Drake Tax"],
    Auditor: ["CaseWare", "IDEA", "Excel", "TeamMate"],
    "Payroll Specialist": ["ADP", "Paychex", "Workday"],
    "Insurance Underwriter": ["Guidewire", "Salesforce", "Excel"],
    "Mortgage Specialist": ["Encompass", "Salesforce", "DocuSign"],
  },
  Healthcare: {
    Doctor: ["Epic", "Oracle Health", "athenahealth"],
    Nurse: ["Epic", "Oracle Health", "Pyxis"],
    Dentist: ["Dentrix", "Open Dental", "Eaglesoft"],
    Pharmacist: ["PioneerRx", "PrimeRx", "QS/1"],
    "Medical Coder": ["3M", "Optum", "Epic"],
    "Medical Biller": ["Kareo", "AdvancedMD", "athenahealth"],
    "Radiology Technician": ["PACS", "Epic", "Sectra"],
    "Medical Records Specialist": ["Epic", "Oracle Health", "MEDITECH"],
    "Healthcare Administrator": ["Workday", "Epic", "Salesforce"],
  },
  Legal: {
    Lawyer: ["Clio", "LexisNexis", "Westlaw", "Microsoft 365"],
    Paralegal: ["Clio", "Westlaw", "LexisNexis", "Adobe Acrobat"],
    "Legal Assistant": ["Clio", "Microsoft 365", "DocuSign"],
    "Legal Researcher": ["Westlaw", "LexisNexis", "Bloomberg Law"],
    "Court Reporter": ["Stenograph software", "Case CATalyst"],
    "Compliance Officer": ["LogicGate", "ServiceNow", "OneTrust"],
  },
  "Business & Management": {
    "Project Manager": ["Asana", "Jira", "Monday.com", "ClickUp", "Linear", "Trello"],
    "Operations Manager": ["Salesforce", "Monday.com", "NetSuite", "SAP"],
    "HR Specialist": ["Workday", "BambooHR", "ADP"],
    Recruiter: ["LinkedIn Recruiter", "Greenhouse", "Lever", "Workday"],
    "Sales Representative": ["Salesforce", "HubSpot", "Outreach", "Gong"],
    "Customer Success Manager": ["Salesforce", "Gainsight", "Zendesk", "Intercom"],
    "Executive Assistant": ["Google Workspace", "Microsoft 365", "Slack", "Calendly"],
    "Business Analyst": ["Excel", "Power BI", "Tableau", "Jira"],
  },
  "Engineering & Architecture": {
    Architect: ["AutoCAD", "Revit", "SketchUp", "Rhino"],
    "Civil Engineer": ["AutoCAD Civil 3D", "ArcGIS", "Revit"],
    "Mechanical Engineer": ["SolidWorks", "AutoCAD", "CATIA"],
    "Electrical Engineer": ["AutoCAD Electrical", "MATLAB", "Altium"],
    "Aerospace Engineer": ["MATLAB", "CATIA", "SolidWorks"],
    "Structural Engineer": ["Revit", "SAP2000", "ETABS"],
    "Construction Estimator": ["Procore", "Bluebeam", "PlanSwift"],
    Surveyor: ["ArcGIS", "AutoCAD Civil 3D", "Trimble"],
  },
  "Logistics & Transportation": {
    Dispatcher: ["Samsara", "Omnitracs", "Geotab"],
    "Logistics Coordinator": ["SAP", "Oracle", "Manhattan Associates"],
    "Supply Chain Analyst": ["SAP", "Oracle", "Power BI", "Excel"],
    "Fleet Manager": ["Samsara", "Geotab", "Motive"],
    "Warehouse Manager": ["Manhattan WMS", "SAP", "Oracle"],
    "Shipping Coordinator": ["ShipStation", "Shippo", "FedEx systems", "UPS systems"],
  },
  "Retail & E-commerce": {
    "E-commerce Manager": ["Shopify", "Amazon Seller Central", "Klaviyo", "Stripe"],
    "Store Manager": ["Shopify POS", "Square", "Lightspeed"],
    "Inventory Manager": ["NetSuite", "Cin7", "Fishbowl"],
    Buyer: ["SAP", "NetSuite", "Shopify"],
    Merchandiser: ["Shopify", "Salesforce"],
    "Customer Service": ["Zendesk", "Gorgias", "Intercom"],
  },
  "Real Estate": {
    "Real Estate Agent": ["MLS", "Zillow", "Realtor.com", "DocuSign"],
    "Property Manager": ["AppFolio", "Buildium", "Yardi"],
    "Leasing Agent": ["Yardi", "AppFolio", "Entrata"],
    "Real Estate Analyst": ["CoStar", "Excel", "Argus"],
    "Real Estate Mortgage Specialist": ["Encompass", "Salesforce", "DocuSign"],
  },
  Creative: {
    "Graphic Designer": ["Photoshop", "Illustrator", "Figma"],
    "Video Editor": ["Premiere Pro", "DaVinci Resolve", "Final Cut Pro"],
    "3D Artist": ["Blender", "Maya", "Cinema 4D"],
    Animator: ["After Effects", "Maya", "Blender"],
    "Music Producer": ["FL Studio", "Ableton", "Logic Pro"],
    Photographer: ["Lightroom", "Photoshop", "Capture One"],
    "VFX Artist": ["Nuke", "Houdini", "Maya", "After Effects"],
  },
  Marketing: {
    "Digital Marketer": ["Google Ads", "Meta Ads", "HubSpot"],
    "SEO Specialist": ["Semrush", "Ahrefs", "Google Search Console"],
    "Social Media Manager": ["Hootsuite", "Buffer", "Sprout Social"],
    "Email Marketer": ["Klaviyo", "Mailchimp", "HubSpot"],
    "Marketing Analyst": ["Google Analytics", "Tableau", "Power BI"],
    "Content Manager": ["WordPress", "Webflow", "Contentful"],
    "Brand Manager": ["Figma", "Asana", "HubSpot"],
  },
  "Science & Research": {
    "Research Scientist": ["MATLAB", "Python", "R", "LabArchives"],
    "Bioinformatics Scientist": ["R", "Python", "Galaxy", "Bioconductor"],
    Statistician: ["R", "SAS", "SPSS", "Python"],
    "GIS Specialist": ["ArcGIS", "QGIS"],
    "Laboratory Technician": ["LIMS", "LabWare", "Benchling"],
    "Environmental Scientist": ["ArcGIS", "QGIS", "MATLAB"],
  },
  Education: {
    Teacher: ["Google Classroom", "Canvas", "Schoology"],
    "School Administrator": ["PowerSchool", "Infinite Campus", "Workday"],
    "Instructional Designer": ["Canvas", "Articulate 360", "Moodle"],
    "Education Data Analyst": ["Power BI", "Tableau", "Excel"],
    "Academic Advisor": ["Salesforce", "Banner", "Workday"],
  },
};

// Always shown regardless of profession.
const universalAppNames = [
  "Gmail", "Outlook", "Google Calendar", "Outlook Calendar", "Slack",
  "Microsoft Teams", "Zoom", "Google Drive", "OneDrive", "Dropbox", "Box",
  "Google Workspace", "Microsoft 365", "Notion",
];

// Mirrors the keys in src/components/brand-icons.tsx's `brandIcons` map (plus
// the special-cased google/microsoft/apple ids) â€” every slug here has a real,
// verified brand mark rendered somewhere in the UI. Kept as a plain list here
// since this seed script runs standalone via node, outside the Next build.
const REAL_LOGO_SLUGS = new Set([
  "google", "microsoft", "apple",
  "gmail", "outlook", "slack", "teams", "microsoft-teams", "zoom", "notion", "github",
  "drive", "google-drive", "dropbox", "onedrive", "box", "google-calendar", "outlook-calendar",
  "trello", "asana", "hubspot", "salesforce", "shopify", "stripe", "paypal", "quickbooks", "okta",
  "gitlab", "jira", "linear", "figma", "vercel", "netlify", "xcode", "android-studio", "firebase",
  "jupyter", "openai", "hugging-face", "aws", "python", "databricks", "snowflake", "tableau",
  "excel", "looker", "splunk", "wireshark", "teamviewer", "docker", "kubernetes", "jenkins",
  "sketch", "testrail", "selenium", "postman", "xero", "adp", "paychex", "docusign", "oracle",
  "clickup", "greenhouse", "zendesk", "intercom", "calendly", "autocad", "autocad-civil-3d",
  "autocad-electrical", "sketchup", "arcgis", "trimble", "sap", "square", "zillow",
  "davinci-resolve", "blender", "maya", "cinema-4d", "nuke", "houdini", "google-ads", "semrush",
  "google-search-console", "hootsuite", "buffer", "mailchimp", "google-analytics", "wordpress",
  "webflow", "contentful", "r", "qgis", "bioconductor", "google-classroom", "canvas", "moodle",
  "microsoft-365", "microsoft-office", "photoshop", "illustrator", "premiere-pro",
  "after-effects", "lightroom", "linkedin-recruiter", "power-bi", "vs-code",
  "adobe-xd", "monday-com", "google-workspace", "fedex-systems", "ups-systems",
  "meta-ads", "rhino", "revit",
]);

// Real, verified official domains â€” only set for slugs we're confident about.
const OFFICIAL_WEBSITES = {
  github: "https://github.com", gitlab: "https://gitlab.com", jira: "https://www.atlassian.com/software/jira",
  linear: "https://linear.app", slack: "https://slack.com", vercel: "https://vercel.com",
  netlify: "https://www.netlify.com", figma: "https://www.figma.com", xcode: "https://developer.apple.com/xcode/",
  "android-studio": "https://developer.android.com/studio", firebase: "https://firebase.google.com",
  jupyter: "https://jupyter.org", openai: "https://openai.com", "hugging-face": "https://huggingface.co",
  aws: "https://aws.amazon.com", python: "https://www.python.org", databricks: "https://www.databricks.com",
  snowflake: "https://www.snowflake.com", tableau: "https://www.tableau.com", "power-bi": "https://powerbi.microsoft.com",
  looker: "https://looker.com", splunk: "https://www.splunk.com", wireshark: "https://www.wireshark.org",
  teamviewer: "https://www.teamviewer.com", docker: "https://www.docker.com", kubernetes: "https://kubernetes.io",
  jenkins: "https://www.jenkins.io", sketch: "https://www.sketch.com", testrail: "https://www.gurock.com/testrail",
  selenium: "https://www.selenium.dev", postman: "https://www.postman.com", quickbooks: "https://quickbooks.intuit.com",
  xero: "https://www.xero.com", adp: "https://www.adp.com", paychex: "https://www.paychex.com",
  workday: "https://www.workday.com", docusign: "https://www.docusign.com", salesforce: "https://www.salesforce.com",
  asana: "https://asana.com", "monday-com": "https://monday.com", clickup: "https://clickup.com",
  bamboohr: "https://www.bamboohr.com", greenhouse: "https://www.greenhouse.io", lever: "https://www.lever.co",
  hubspot: "https://www.hubspot.com", outreach: "https://www.outreach.io", gong: "https://www.gong.io",
  gainsight: "https://www.gainsight.com", zendesk: "https://www.zendesk.com", intercom: "https://www.intercom.com",
  "google-workspace": "https://workspace.google.com", "microsoft-365": "https://www.microsoft.com/microsoft-365",
  calendly: "https://calendly.com", autocad: "https://www.autodesk.com/products/autocad",
  revit: "https://www.autodesk.com/products/revit", sketchup: "https://www.sketchup.com",
  rhino: "https://www.rhino3d.com", arcgis: "https://www.esri.com/en-us/arcgis", solidworks: "https://www.solidworks.com",
  matlab: "https://www.mathworks.com/products/matlab.html", altium: "https://www.altium.com",
  procore: "https://www.procore.com", bluebeam: "https://www.bluebeam.com", trimble: "https://www.trimble.com",
  samsara: "https://www.samsara.com", geotab: "https://www.geotab.com", oracle: "https://www.oracle.com",
  shopify: "https://www.shopify.com", "amazon-seller-central": "https://sell.amazon.com", klaviyo: "https://www.klaviyo.com",
  square: "https://squareup.com", "net-suite": "https://www.netsuite.com", zillow: "https://www.zillow.com",
  "realtor-com": "https://www.realtor.com", appfolio: "https://www.appfolio.com", buildium: "https://www.buildium.com",
  yardi: "https://www.yardi.com", costar: "https://www.costar.com", photoshop: "https://www.adobe.com/products/photoshop.html",
  illustrator: "https://www.adobe.com/products/illustrator.html", "premiere-pro": "https://www.adobe.com/products/premiere.html",
  "davinci-resolve": "https://www.blackmagicdesign.com/products/davinciresolve", blender: "https://www.blender.org",
  maya: "https://www.autodesk.com/products/maya", "cinema-4d": "https://www.maxon.net/en/cinema-4d",
  "after-effects": "https://www.adobe.com/products/aftereffects.html", "fl-studio": "https://www.image-line.com",
  ableton: "https://www.ableton.com", "logic-pro": "https://www.apple.com/logic-pro/", lightroom: "https://www.adobe.com/products/photoshop-lightroom.html",
  "capture-one": "https://www.captureone.com", nuke: "https://www.foundry.com/products/nuke-family/nuke",
  houdini: "https://www.sidefx.com", "google-ads": "https://ads.google.com", "meta-ads": "https://www.facebook.com/business/ads",
  semrush: "https://www.semrush.com", ahrefs: "https://ahrefs.com", "google-search-console": "https://search.google.com/search-console",
  hootsuite: "https://www.hootsuite.com", buffer: "https://buffer.com", mailchimp: "https://mailchimp.com",
  "google-analytics": "https://analytics.google.com", wordpress: "https://wordpress.org", webflow: "https://webflow.com",
  contentful: "https://www.contentful.com", "google-classroom": "https://classroom.google.com",
  canvas: "https://www.instructure.com/canvas", moodle: "https://moodle.org", banner: "https://www.ellucian.com",
  gmail: "https://mail.google.com", outlook: "https://outlook.com", "microsoft-teams": "https://www.microsoft.com/microsoft-teams",
  zoom: "https://zoom.us", "google-calendar": "https://calendar.google.com", "outlook-calendar": "https://outlook.com/calendar",
  "google-drive": "https://drive.google.com", onedrive: "https://onedrive.live.com", dropbox: "https://www.dropbox.com",
  box: "https://www.box.com", notion: "https://www.notion.so", trello: "https://trello.com", stripe: "https://stripe.com",
  "linkedin-recruiter": "https://business.linkedin.com/talent-solutions/recruiter",
  "vs-code": "https://code.visualstudio.com", "adobe-xd": "https://www.adobe.com/products/xd.html",
  "fedex-systems": "https://www.fedex.com", "ups-systems": "https://www.ups.com",
};

// Mirrors the hex values in brand-icons.tsx for the slugs that have a real
// logo â€” kept in sync manually since this script runs outside the TS build.
const BRAND_COLORS = {
  gmail: "#EA4335", outlook: "#0078D4", slack: "#4A154B", "microsoft-teams": "#6264A7",
  zoom: "#2D8CFF", notion: "#000000", github: "#181717", "google-drive": "#0F9D58",
  dropbox: "#0061FF", onedrive: "#0078D4", box: "#0061D5", "google-calendar": "#4285F4",
  "outlook-calendar": "#0078D4", trello: "#0052CC", asana: "#F06A6A", hubspot: "#FF7A59",
  salesforce: "#00A1E0", shopify: "#95BF47", stripe: "#635BFF", paypal: "#003087",
  quickbooks: "#2CA01C", okta: "#007DC1", gitlab: "#FC6D26", jira: "#0052CC",
  linear: "#5E6AD2", figma: "#F24E1E", vercel: "#000000", netlify: "#00C7B7",
  xcode: "#147EFB", "android-studio": "#3DDC84", firebase: "#FFCA28", jupyter: "#F37626",
  openai: "#000000", "hugging-face": "#FFD21E", aws: "#FF9900", python: "#3776AB",
  databricks: "#FF3621", snowflake: "#29B5E8", tableau: "#E97627", excel: "#217346",
  looker: "#4285F4", splunk: "#000000", wireshark: "#1679A7", teamviewer: "#004680",
  docker: "#2496ED", kubernetes: "#326CE5", jenkins: "#D24939", sketch: "#F7B500",
  testrail: "#65C179", selenium: "#43B02A", postman: "#FF6C37", xero: "#13B5EA",
  adp: "#D0271D", paychex: "#004B8D", docusign: "#FFCC22", oracle: "#F80000",
  clickup: "#7B68EE", greenhouse: "#24A47F", zendesk: "#03363D", intercom: "#000000",
  calendly: "#006BFF", autocad: "#E51050", sketchup: "#005F9E", arcgis: "#2C7AC3",
  trimble: "#003F87", sap: "#0FAAFF", square: "#3E4348", zillow: "#006AFF",
  "davinci-resolve": "#233A51", blender: "#E87D0D", maya: "#0696D7", "cinema-4d": "#011A6A",
  nuke: "#000000", houdini: "#FF4713", "google-ads": "#4285F4", semrush: "#FF642D",
  "google-search-console": "#458CF5", hootsuite: "#143059", buffer: "#231F20",
  mailchimp: "#FFE01B", "google-analytics": "#E37400", wordpress: "#21759B",
  webflow: "#146EF5", contentful: "#F36458", r: "#276DC3", qgis: "#589632",
  bioconductor: "#191970", "google-classroom": "#4285F4", canvas: "#E13F76", moodle: "#F98012",
  "microsoft-365": "#D83B01", photoshop: "#31A8FF", illustrator: "#FF9A00",
  "premiere-pro": "#9999FF", "after-effects": "#9999FF", lightroom: "#31A8FF",
  google: "#4285F4", microsoft: "#00A4EF", apple: "#000000",
  "linkedin-recruiter": "#0A66C2", "power-bi": "#F2C811", "vs-code": "#007ACC",
  "adobe-xd": "#FF61F6", "monday-com": "#FF3D57", "google-workspace": "#4285F4",
  "fedex-systems": "#4D148C", "ups-systems": "#351C15", "meta-ads": "#0081FB",
  rhino: "#801010", revit: "#8B44F4",
};

// Local/desktop software â€” no cloud account for STACK to authorize against.
const DESKTOP_SLUGS = new Set([
  "vs-code", "xcode", "android-studio", "jupyter", "python", "excel", "sql", "photoshop",
  "illustrator", "premiere-pro", "after-effects", "adobe-xd", "final-cut-pro", "davinci-resolve",
  "blender", "maya", "cinema-4d", "houdini", "nuke", "fl-studio", "ableton", "logic-pro",
  "lightroom", "capture-one", "autocad", "revit", "sketchup", "rhino", "autocad-civil-3d",
  "solidworks", "catia", "autocad-electrical", "matlab", "altium", "sap2000", "etabs",
  "wireshark", "teamviewer", "docker", "kubernetes", "jenkins", "sketch", "figjam", "selenium",
  "postman", "r", "sas", "spss", "qgis",
]);

// Public-data or consumer-facing services with no self-serve OAuth/API STACK
// could realistically get access to â€” never fabricate a connection for these.
const UNAVAILABLE_SLUGS = new Set([
  "mls", "zillow", "realtor-com", "costar", "bloomberg-terminal", "bloomberg", "argus",
]);

function appRowFor(name) {
  const slug = slugify(name === "Encompass2" ? "Encompass" : name);
  const meta = APP_META[name];
  if (!meta) throw new Error(`Missing APP_META entry for "${name}"`);
  const [category, description] = meta;
  const oauthProviderId = PROVIDER_MAP[slug] ?? null;

  let authType = "ExternalTool";
  if (oauthProviderId) authType = "OAuth2";
  else if (DESKTOP_SLUGS.has(slug)) authType = "DesktopApp";
  else if (UNAVAILABLE_SLUGS.has(slug)) authType = "Unavailable";

  return {
    slug,
    name: name === "Encompass2" ? "Encompass" : name,
    category,
    description,
    officialWebsite: OFFICIAL_WEBSITES[slug] ?? null,
    brandColor: BRAND_COLORS[slug] ?? null,
    authType,
    hasRealLogo: REAL_LOGO_SLUGS.has(slug),
    oauthProviderId,
    isUniversal: universalAppNames.includes(name),
  };
}

async function main() {
  const appRows = new Map();
  for (const name of universalAppNames) {
    const row = appRowFor(name);
    appRows.set(row.slug, row);
  }

  const professionRows = [];
  for (const [category, professions] of Object.entries(professionCategories)) {
    for (const [name, appNames] of Object.entries(professions)) {
      const appSlugs = appNames.map((n) => {
        const row = appRowFor(n);
        if (!appRows.has(row.slug)) appRows.set(row.slug, row);
        return row.slug;
      });
      professionRows.push({
        slug: slugify(name),
        name,
        category,
        recommendedAppSlugs: appSlugs,
      });
    }
  }

  console.log(`Upserting ${appRows.size} apps and ${professionRows.length} professions...`);

  for (const app of appRows.values()) {
    await db.app.upsert({
      where: { slug: app.slug },
      create: app,
      update: app,
    });
  }

  for (const profession of professionRows) {
    await db.profession.upsert({
      where: { slug: profession.slug },
      create: profession,
      update: profession,
    });
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
