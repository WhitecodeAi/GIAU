import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:min-h-[80px] group-[.toaster]:text-lg group-[.toaster]:p-6",
          description:
            "group-[.toast]:text-muted-foreground group-[.toast]:text-base",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
        style: {
          fontSize: "18px",
          padding: "24px",
          minHeight: "80px",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
