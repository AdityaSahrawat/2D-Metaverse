const Features = () => {
  const features = [
    {
      emoji: "🔗",
      title: "Join Rooms Instantly",
      description: "Use room codes or links to jump into live spaces — no setup needed."
    },
    {
      emoji: "🗣",
      title: "Talk & Interact in Real-Time",
      description: "Meet others through voice, chat, or spatial proximity."
    },
    {
      emoji: "🧭",
      title: "Explore Shared Spaces",
      description: "Discover who's online, what's happening, and move freely."
    },
    {
      emoji: "🎯",
      title: "Stay Connected",
      description: "Rejoin previous rooms or get notified when your friends are online."
    }
  ];

  return (
    <section id="features" className="py-20 bg-slate-800/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            HOW IT WORKS
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">{feature.emoji}</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                {feature.title}
              </h3>
              <p className="text-slate-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;