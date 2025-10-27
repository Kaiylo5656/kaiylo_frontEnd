# Modal Management System

This directory contains a comprehensive modal management system that handles stacked modals with proper focus, accessibility, and event isolation.

## Components

### ModalManager
- **ModalManagerProvider**: Context provider that tracks modal stack
- **useModalManager**: Hook to access modal management functions
- **useRegisterModal**: Hook to register/unregister modals and check if they're topmost

### BaseModal
- **BaseModal**: Wrapper component that handles focus, accessibility, and event isolation
- **ModalPortal**: Renders modals in portals with proper z-index management

## Usage

### 1. Wrap your app with ModalManagerProvider

```jsx
import { ModalManagerProvider } from './components/ui/modal/ModalManager';

function App() {
  return (
    <ModalManagerProvider>
      {/* Your app content */}
    </ModalManagerProvider>
  );
}
```

### 2. Use BaseModal for your modals

```jsx
import BaseModal from './components/ui/modal/BaseModal';
import { useModalManager } from './components/ui/modal/ModalManager';

const MyModal = ({ isOpen, onClose }) => {
  const { isTopMost } = useModalManager();
  const modalId = 'my-modal';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      modalId={modalId}
      zIndex={60}
      closeOnEsc={isTopMost}
      closeOnBackdrop={isTopMost}
      title="My Modal"
    >
      {/* Modal content */}
    </BaseModal>
  );
};
```

### 3. For nested modals

```jsx
const ParentModal = ({ isOpen, onClose }) => {
  const [childOpen, setChildOpen] = useState(false);
  const { isTopMost } = useModalManager();
  const modalId = 'parent-modal';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      modalId={modalId}
      zIndex={60}
      closeOnEsc={isTopMost}
      closeOnBackdrop={isTopMost}
    >
      <button onClick={() => setChildOpen(true)}>
        Open Child Modal
      </button>
      
      <ChildModal
        isOpen={childOpen}
        onClose={() => setChildOpen(false)}
      />
    </BaseModal>
  );
};

const ChildModal = ({ isOpen, onClose }) => {
  const { isTopMost } = useModalManager();
  const modalId = 'child-modal';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      modalId={modalId}
      zIndex={80}
      closeOnEsc={isTopMost}
      closeOnBackdrop={isTopMost}
    >
      {/* Child modal content */}
    </BaseModal>
  );
};
```

## Features

### Focus Management
- Automatically focuses the first focusable element when modal opens
- Restores focus to the element that opened the modal when it closes
- Traps focus within the modal

### Accessibility
- `role="dialog"` and `aria-modal="true"` on all modals
- `aria-labelledby` for modal titles
- `aria-hidden` applied to parent modals when child is open

### Event Isolation
- Only the topmost modal responds to ESC and backdrop clicks
- Event propagation is stopped to prevent parent modal interactions
- Proper z-index layering with backdrop opacity differences

### Scroll Locking
- Body scroll is locked when first modal opens
- Remains locked until all modals are closed
- No duplicate scroll locks for nested modals

## Z-Index Guidelines

- **Parent Modal**: backdrop z-50, panel z-60
- **Child Modal**: backdrop z-70, panel z-80
- **Deeply Nested**: increment by 20 for each level

## Props

### BaseModal Props
- `isOpen`: boolean - whether modal is open
- `onClose`: function - called when modal should close
- `modalId`: string - unique identifier for the modal
- `zIndex`: number - z-index for the modal (default: 50)
- `closeOnEsc`: boolean - whether ESC should close modal (default: true)
- `closeOnBackdrop`: boolean - whether backdrop click should close modal (default: true)
- `title`: string - modal title (optional)
- `size`: string - modal size ('sm', 'md', 'lg', 'xl', '2xl')
- `className`: string - additional CSS classes

## Best Practices

1. **Always use unique modalId** for each modal
2. **Check isTopMost** before handling ESC/backdrop events
3. **Use appropriate z-index** values for layering
4. **Keep modal content focused** - avoid complex nested structures
5. **Test keyboard navigation** to ensure proper focus management
