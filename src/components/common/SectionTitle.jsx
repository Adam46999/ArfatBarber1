export default function SectionTitle({ children, icon }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl md:text-4xl font-extrabold text-gold tracking-wide relative inline-block">
        {icon && <span className="mr-2">{icon}</span>}
        {children}
        <span className="block w-16 h-1 bg-gold mx-auto mt-2 rounded-full"></span>
      </h2>
    </div>
  );
}
