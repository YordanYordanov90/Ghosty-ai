import { dark } from "@clerk/ui/themes";

/** Dark scrim behind UserProfile / modals — matches `--bg-base`, not light gray. */
const modalBackdrop = {
  backgroundColor: "rgba(8, 8, 9, 0.92)",
  backdropFilter: "blur(8px)",
} as const;

/**
 * Clerk appearance: dark theme + literal hex (color-mix safe) + inline element styles.
 *
 * Root `elements` target SignIn / SignUp. `userButton` / `userProfile` scope
 * dropdown + account modal (popover footer stripe, modal backdrop, contrast).
 */
export const clerkAppearance = {
  theme: dark,
  variables: {
    colorPrimary: "#00c8d4",
    colorPrimaryForeground: "#080809",
    colorBackground: "#111114",
    colorForeground: "#f0f0f4",
    colorMuted: "#1e1e23",
    colorMutedForeground: "#808090",
    colorInput: "#18181c",
    colorInputForeground: "#f0f0f4",
    colorNeutral: "#2a2a30",
    colorBorder: "#3a3a42",
    colorRing: "#00c8d4",
    colorDanger: "#ff4d4f",
    colorSuccess: "#34d399",
    borderRadius: "0.75rem",
    colorModalBackdrop: "rgba(8, 8, 9, 0.92)",
  },
  elements: {
    rootBox: {
      width: "100%",
    },
    card: {
      background: "#111114",
      border: "1px solid #3a3a42",
      boxShadow: "0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,200,212,0.07)",
      borderRadius: "1.25rem",
    },
    headerTitle: {
      color: "#f0f0f4",
    },
    headerSubtitle: {
      color: "#808090",
    },
    socialButtonsBlockButton: {
      background: "#18181c",
      border: "1px solid #3a3a42",
      color: "#f0f0f4",
      boxShadow: "none",
    },
    socialButtonsBlockButtonText: {
      color: "#c0c0cc",
      fontWeight: "500",
    },
    socialButtonsProviderIcon: {
      opacity: 1,
    },
    dividerLine: {
      background: "#2a2a30",
    },
    dividerText: {
      color: "#505060",
    },
    formFieldLabel: {
      color: "#c0c0cc",
    },
    formFieldInput: {
      background: "#18181c",
      border: "1px solid #2a2a30",
      color: "#f0f0f4",
    },
    formButtonPrimary: {
      background: "#00c8d4",
      color: "#080809",
    },
    footerActionText: {
      color: "#808090",
    },
    footerActionLink: {
      color: "#00c8d4",
    },
    footer: {
      background: "#0d0d10",
      borderTop: "1px solid #2a2a30",
      borderRadius: "0 0 1.25rem 1.25rem",
    },
    identityPreviewText: {
      color: "#c0c0cc",
    },
    identityPreviewEditButton: {
      color: "#00c8d4",
    },
    modalBackdrop,
    modalContent: {
      backgroundColor: "#080809",
      border: "1px solid #3a3a42",
      borderRadius: "1rem",
      boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      overflow: "hidden",
    },
  },
  userButton: {
    elements: {
      userButtonPopoverCard: {
        backgroundColor: "#111114",
        border: "1px solid #3a3a42",
        borderRadius: "12px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
      },
      userButtonPopoverMain: {
        backgroundColor: "#111114",
      },
      userButtonPopoverActions: {
        backgroundColor: "#111114",
      },
      userButtonPopoverActionButton: {
        color: "#f0f0f4",
      },
      userButtonPopoverActionButtonIconBox: {
        color: "#00c8d4",
      },
      userButtonPopoverActionButtonIcon: {
        color: "#00c8d4",
      },
      userButtonPopoverFooter: {
        backgroundColor: "#0d0d10",
        backgroundImage: "none",
        borderTop: "1px solid #2a2a30",
      },
      userPreviewMainIdentifier: {
        color: "#f0f0f4",
      },
      userPreviewMainIdentifierText: {
        color: "#f0f0f4",
      },
      userPreviewSecondaryIdentifier: {
        color: "#c0c0cc",
      },
    },
  },
  userProfile: {
    elements: {
      modalBackdrop,
      modalContent: {
        backgroundColor: "#080809",
        border: "1px solid #3a3a42",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      },
      navbar: {
        backgroundColor: "#111114",
        backgroundImage: "none",
      },
      page: {
        backgroundColor: "#080809",
      },
      pageScrollBox: {
        backgroundColor: "#080809",
      },
      headerTitle: {
        color: "#f0f0f4",
      },
      headerSubtitle: {
        color: "#808090",
      },
      navbarButtonText: {
        color: "#c0c0cc",
      },
      navbarButtonIcon: {
        color: "#808090",
      },
    },
  },
};
