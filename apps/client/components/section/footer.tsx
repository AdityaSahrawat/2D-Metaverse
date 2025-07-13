const Footer = () => {
  return (
    <footer className="bg-slate-800 text-gray-300 py-6 mt-12">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm">
        <p>&copy; {new Date().getFullYear()} MyMetaverseApp. All rights reserved.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <a href="/privacy" className="hover:text-white">Privacy Policy</a>
          <a href="/terms" className="hover:text-white">Terms of Service</a>
          <a href="https://github.com/repo" target="_blank" rel="noopener noreferrer" className="hover:text-white">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;