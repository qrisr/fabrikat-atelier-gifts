/** English copy. The German catalogue (de.ts) must match this shape. */

export const en = {
  meta: {
    appName: "Fabrikat Gift Atelier",
    description: "Premium, personalised year-end gifts for Swiss companies — curated by Fabrikat, Zurich.",
  },
  brand: {
    wordmark: "Fabrikat",
    subline: "Gift Atelier · Zürich",
  },
  nav: {
    section: "Gift atelier",
    campaigns: "Campaigns",
    templates: "Gift Templates",
    recipients: "Recipients",
    quoteReview: "Quote Review",
    open: "Open navigation",
    close: "Close navigation",
    current: "Current page",
    main: "Main navigation",
  },
  workspace: {
    active: "Active workspace",
    switch: "Switch workspace",
    heading: "Your workspaces",
  },
  notFound: {
    title: "This page could not be found",
    body: "The address may have changed. Let us take you back to your campaigns.",
    action: "Back to campaigns",
  },
  error: {
    title: "This page didn't load",
    body: "Something went wrong on our side. Please try again in a moment.",
    retry: "Try again",
    home: "Back to campaigns",
  },
  pages: {
    templates: {
      eyebrow: "Curated collection",
      title: "Gift Templates",
      description: "Considered objects, assembled in Zurich. Choose a starting point and make it distinctly yours.",
      emptyEyebrow: "Collection arriving soon",
      emptyTitle: "A quieter kind of gifting.",
      emptyBody: "Our atelier is preparing this season's selection of enduring objects.",
      emptyAction: "Start a campaign",
    },
    recipients: {
      eyebrow: "People & delivery",
      title: "Recipient Manager",
      description: "Every name, address and personal detail — considered and in one place.",
      emptyEyebrow: "No recipients yet",
      emptyTitle: "Begin with the people.",
      emptyBody: "Recipients belong to a campaign. Start one, then add your list or share a confirmation link.",
      emptyAction: "Start a campaign",
    },
    quoteReview: {
      eyebrow: "Final consideration",
      title: "Quote Review",
      description: "A clear view of your chosen gifts, personal details, quantities and atelier services.",
      emptyEyebrow: "Nothing to review",
      emptyTitle: "Your quote begins with a campaign.",
      emptyBody: "Once your selection is ready, Fabrikat reviews every detail and prepares a considered offer.",
      emptyAction: "Start a campaign",
    },
  },
};

export type Messages = typeof en;
