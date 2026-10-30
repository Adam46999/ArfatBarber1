// src/components/common/SectionTitle.jsx
export default function SectionTitle({ children, icon }) {
  return (
    <div className="text-center mb-10">
      <div className="flex items-center justify-center gap-3">
        {icon && (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gold/10 text-gold">
            {icon}
          </div>
        )}
        <h2 className="text-3xl md:text-4xl font-extrabold text-gold tracking-wide">
          {children}
        </h2>
      </div>
      <span className="block w-24 h-[3px] bg-gold mx-auto mt-3 rounded-full shadow-sm"></span>
    </div>
  );
}
