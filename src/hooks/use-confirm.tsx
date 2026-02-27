import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveCallback, setResolveCallback] = useState<(value: boolean) => void>(() => {});

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveCallback(() => resolve);
    });
  }, []);

  const onConfirm = useCallback(() => {
    setIsOpen(false);
    resolveCallback(true);
  }, [resolveCallback]);

  const onCancel = useCallback(() => {
    setIsOpen(false);
    resolveCallback(false);
  }, [resolveCallback]);

  return {
    isOpen,
    options,
    confirm,
    onConfirm,
    onCancel,
  };
};
