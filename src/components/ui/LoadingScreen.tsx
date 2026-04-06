interface LoadingScreenProps {
  fullScreen?: boolean;
}

export const LoadingScreen = ({ fullScreen = false }: LoadingScreenProps) => {
  return (
    <div className={fullScreen ? "min-h-screen flex items-center justify-center" : "flex items-center justify-center py-32"}>
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
};
