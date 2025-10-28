/**
 * @fileoverview Test suite for Loading Components
 * 
 * Tests various loading UI components:
 * - LoadingSpinner with different sizes and colors
 * - LoadingDots with animation
 * - LoadingOverlay for full-page loading
 * - InlineLoading for conditional rendering
 * - LoadingButton for interactive loading states
 * 
 * @see {@link LoadingComponents} for implementation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  LoadingSpinner,
  LoadingDots,
  LoadingOverlay,
  InlineLoading,
  LoadingButton,
} from '../LoadingComponents';

describe('LoadingSpinner', () => {
  it('should render with default props', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-6', 'w-6'); // medium size
    expect(svg).toHaveClass('text-blue-600'); // blue color
    expect(svg).toHaveClass('animate-spin');
  });

  it('should render with small size', () => {
    const { container } = render(<LoadingSpinner size="small" />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('h-4', 'w-4');
  });

  it('should render with large size', () => {
    const { container } = render(<LoadingSpinner size="large" />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('h-8', 'w-8');
  });

  it('should render with white color', () => {
    const { container } = render(<LoadingSpinner color="white" />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('text-white');
  });

  it('should render with gray color', () => {
    const { container } = render(<LoadingSpinner color="gray" />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('text-gray-600');
  });

  it('should accept custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    const wrapper = container.firstChild;
    
    expect(wrapper).toHaveClass('custom-class');
  });

  it('should combine size and color props', () => {
    const { container } = render(<LoadingSpinner size="large" color="white" />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('h-8', 'w-8', 'text-white');
  });
});

describe('LoadingDots', () => {
  it('should render with default props', () => {
    const { container } = render(<LoadingDots />);
    const dots = container.querySelectorAll('.animate-bounce');
    
    expect(dots).toHaveLength(3);
    dots.forEach(dot => {
      expect(dot).toHaveClass('bg-blue-600');
    });
  });

  it('should render with white color', () => {
    const { container } = render(<LoadingDots color="white" />);
    const dots = container.querySelectorAll('.animate-bounce');
    
    dots.forEach(dot => {
      expect(dot).toHaveClass('bg-white');
    });
  });

  it('should render with gray color', () => {
    const { container } = render(<LoadingDots color="gray" />);
    const dots = container.querySelectorAll('.animate-bounce');
    
    dots.forEach(dot => {
      expect(dot).toHaveClass('bg-gray-600');
    });
  });

  it('should accept custom className', () => {
    const { container } = render(<LoadingDots className="my-custom-class" />);
    const wrapper = container.firstChild;
    
    expect(wrapper).toHaveClass('my-custom-class', 'flex', 'space-x-1');
  });

  it('should have staggered animation delays', () => {
    const { container } = render(<LoadingDots />);
    const dots = container.querySelectorAll('.animate-bounce');
    
    expect(dots[0]).toHaveStyle({ animationDelay: '0ms' });
    expect(dots[1]).toHaveStyle({ animationDelay: '150ms' });
    expect(dots[2]).toHaveStyle({ animationDelay: '300ms' });
  });
});

describe('LoadingOverlay', () => {
  it('should render when isVisible is true', () => {
    render(<LoadingOverlay isVisible={true} message="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should not render when isVisible is false', () => {
    const { container } = render(
      <LoadingOverlay isVisible={false} message="Loading data..." />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should display the provided message', () => {
    render(<LoadingOverlay isVisible={true} message="Please wait..." />);
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('should render with spinner', () => {
    const { container } = render(
      <LoadingOverlay isVisible={true} message="Loading" />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-8', 'w-8'); // large spinner
  });

  it('should accept custom className', () => {
    const { container } = render(
      <LoadingOverlay isVisible={true} message="Test" className="z-100" />
    );
    
    const overlay = container.firstChild;
    expect(overlay).toHaveClass('z-100');
  });

  it('should have overlay styling', () => {
    const { container } = render(
      <LoadingOverlay isVisible={true} message="Test" />
    );
    
    const overlay = container.firstChild;
    expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
  });
});

describe('InlineLoading', () => {
  it('should show loading state when isLoading is true', () => {
    render(
      <InlineLoading isLoading={true}>
        <div>Content</div>
      </InlineLoading>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should show children when isLoading is false', () => {
    render(
      <InlineLoading isLoading={false}>
        <div>Content</div>
      </InlineLoading>
    );
    
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should use custom loading text', () => {
    render(
      <InlineLoading isLoading={true} loadingText="Processing...">
        <div>Content</div>
      </InlineLoading>
    );
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should show spinner by default when loading', () => {
    const { container } = render(
      <InlineLoading isLoading={true}>
        <div>Content</div>
      </InlineLoading>
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should hide spinner when showSpinner is false', () => {
    const { container } = render(
      <InlineLoading isLoading={true} showSpinner={false}>
        <div>Content</div>
      </InlineLoading>
    );
    
    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(
      <InlineLoading isLoading={true} className="my-class">
        <div>Content</div>
      </InlineLoading>
    );
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('my-class');
  });

  it('should render children unchanged when not loading', () => {
    render(
      <InlineLoading isLoading={false}>
        <div data-testid="child">Complex Content</div>
      </InlineLoading>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

describe('LoadingButton', () => {
  it('should render button with children when not loading', () => {
    render(
      <LoadingButton isLoading={false}>
        Click Me
      </LoadingButton>
    );
    
    expect(screen.getByRole('button')).toHaveTextContent('Click Me');
  });

  it('should disable button when isLoading is true', () => {
    render(
      <LoadingButton isLoading={true}>
        Click Me
      </LoadingButton>
    );
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should show spinner when loading', () => {
    const { container } = render(
      <LoadingButton isLoading={true}>
        Click Me
      </LoadingButton>
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-white'); // white spinner
  });

  it('should show loading text when provided', () => {
    render(
      <LoadingButton isLoading={true} loadingText="Saving...">
        Save
      </LoadingButton>
    );
    
    expect(screen.getByRole('button')).toHaveTextContent('Saving...');
  });

  it('should show children text when loading without loadingText', () => {
    render(
      <LoadingButton isLoading={true}>
        Submit
      </LoadingButton>
    );
    
    expect(screen.getByRole('button')).toHaveTextContent('Submit');
  });

  it('should accept custom className', () => {
    render(
      <LoadingButton isLoading={false} className="btn-primary">
        Click
      </LoadingButton>
    );
    
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('should respect disabled prop when not loading', () => {
    render(
      <LoadingButton isLoading={false} disabled={true}>
        Click Me
      </LoadingButton>
    );
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should pass through button props', () => {
    const handleClick = vi.fn();
    
    render(
      <LoadingButton 
        isLoading={false} 
        onClick={handleClick}
        type="submit"
        data-testid="custom-btn"
      >
        Submit
      </LoadingButton>
    );
    
    const button = screen.getByTestId('custom-btn');
    expect(button).toHaveAttribute('type', 'submit');
    
    button.click();
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should not call onClick when loading', () => {
    const handleClick = vi.fn();
    
    render(
      <LoadingButton isLoading={true} onClick={handleClick}>
        Click
      </LoadingButton>
    );
    
    const button = screen.getByRole('button');
    button.click();
    
    // Button is disabled, so onClick should not be called
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should switch between loading and normal states', () => {
    const { rerender } = render(
      <LoadingButton isLoading={false}>
        Save
      </LoadingButton>
    );
    
    expect(screen.getByRole('button')).not.toBeDisabled();
    
    rerender(
      <LoadingButton isLoading={true} loadingText="Saving...">
        Save
      </LoadingButton>
    );
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });
});
