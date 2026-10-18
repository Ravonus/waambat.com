import PageSkeleton from "~/app/components/navigation/PageSkeleton";
export default function Loading() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-[1080px] px-5 py-16"
    >
      <PageSkeleton />
    </main>
  );
}
