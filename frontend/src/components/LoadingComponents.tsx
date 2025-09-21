import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'blue' | 'white' | 'gray';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'blue',
  className = '',
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8',
  };

  const colorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600',
  };

  return (
    <div className={`${className}`}>
      <svg
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
      >
        <circle
          className='opacity-25'
          cx='12'
          cy='12'
          r='10'
          stroke='currentColor'
          strokeWidth='4'
        />
        <path
          className='opacity-75'
          fill='currentColor'
          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
        />
      </svg>
    </div>
  );
};

interface LoadingDotsProps {
  color?: 'blue' | 'white' | 'gray';
  className?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  color = 'blue',
  className = '',
}) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    white: 'bg-white',
    gray: 'bg-gray-600',
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      <div
        className={`h-2 w-2 rounded-full ${colorClasses[color]} animate-bounce`}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={`h-2 w-2 rounded-full ${colorClasses[color]} animate-bounce`}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={`h-2 w-2 rounded-full ${colorClasses[color]} animate-bounce`}
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
};

interface LoadingOverlayProps {
  isVisible: boolean;
  message: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message,
  className = '',
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}
    >
      <div className='bg-white rounded-lg p-6 shadow-lg flex flex-col items-center space-y-4'>
        <LoadingSpinner size='large' />
        <p className='text-gray-700 font-medium'>{message}</p>
      </div>
    </div>
  );
};

interface InlineLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  showSpinner?: boolean;
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  isLoading,
  children,
  loadingText = 'Loading...',
  showSpinner = true,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showSpinner && <LoadingSpinner size='small' />}
        <span className='text-gray-600'>{loadingText}</span>
      </div>
    );
  }

  return <>{children}</>;
};

interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  loadingText,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled ?? isLoading}
      className={`flex items-center justify-center space-x-2 ${className}`}
    >
      {isLoading && <LoadingSpinner size='small' color='white' />}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </button>
  );
};
