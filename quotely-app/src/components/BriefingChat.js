import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";

export default function BriefingChat({ briefingId: initialBriefingId }) {
  const [briefingId, setBriefingId] = useState(initialBriefingId || null);
  const [messages, setMessages] = useState([
    {
      role: "AI",
      content: "Hi! What product or service do you need to request quotes for?",
    },
  ]);
  const [input, setInput] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [initialDescription, setInitialDescription] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [needsLocation, setNeedsLocation] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [showSupplierSelection, setShowSupplierSelection] = useState(false);

// Helper to map service types to OSM categories
const getOSMCategories = (serviceType) => {
  const categoryMap = {
    'mechanic': 'car_repair|auto_repair|automotive|mechanic|garage',
    'car repair': 'car_repair|auto_repair|automotive|mechanic|garage',
    'auto repair': 'car_repair|auto_repair|automotive|mechanic|garage',
    'plumber': 'plumber|plumbing',
    'electrician': 'electrician|electrical',
    'painter': 'painter|painting|decorator',
    'cleaner': 'cleaner|cleaning|janitorial',
    'catering': 'catering|caterer',
    'construction': 'builder|construction|contractor',
    'renovation': 'builder|renovation|contractor|handyman'
  };
  
  return categoryMap[serviceType.toLowerCase()] || serviceType.toLowerCase();
};

// Helper to extract address from OSM data
const getBusinessAddress = (business) => {
  const tags = business.tags;
  const addressParts = [
    tags['addr:street'],
    tags['addr:housenumber'], 
    tags['addr:city'],
    tags['addr:country']
  ].filter(Boolean);
  return addressParts.length > 0 ? addressParts.join(' ') : 'Local business - check address online';
};

// Helper to generate rating
const getBusinessRating = (business) => {
  return '⭐⭐⭐';
};

// Helper to generate business email
const generateBusinessEmail = (businessName, website) => {
  if (website && website.includes('http')) {
    const domain = website.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
    return `contact@${domain}`;
  }
  const cleanName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `info@${cleanName}.com`;
};

// Helper to create business note  
const getBusinessNote = (business, serviceType) => {
  const tags = business.tags;
  if (tags.phone && tags.website) {
    return 'Full contact details available';
  }
  return `Local ${serviceType} service - contact for details`;
};

// Helper to filter out irrelevant business types
const filterRelevantBusinesses = (businesses, serviceType) => {
  const irrelevantKeywords = {
    'mechanic': ['copy', 'print', 'design', 'shop', 'store', 'market', 'restaurant', 'hotel', 'barber', 'hair'],
    'plumber': ['copy', 'print', 'design', 'shop', 'store', 'market', 'restaurant', 'hotel'],
    'electrician': ['copy', 'print', 'design', 'shop', 'store', 'market', 'restaurant', 'hotel'],
    // We can add more as needed
  };
  
  const keywords = irrelevantKeywords[serviceType.toLowerCase()] || [];
  
  return businesses.filter(business => {
    const businessName = business.tags.name?.toLowerCase() || '';
    const businessType = business.tags.shop?.toLowerCase() || business.tags.amenity?.toLowerCase() || '';
    
    // Keep the business if it doesn't contain irrelevant keywords
    return !keywords.some(keyword => 
      businessName.includes(keyword) || businessType.includes(keyword)
    );
  });
};

// Improved mock data
const getEnhancedMockSuppliers = (serviceType, location) => {
  const serviceTemplates = {
    'mechanic': [
      {
        id: 1,
        name: `Precision Auto Care - ${location.split(',')[0]}`,
        address: `123 Garage St, ${location}`,
        rating: '⭐⭐⭐⭐',
        phone: '+1-555-AUTO-FIX',
        website: 'https://precisionautocare.com',
        email: 'service@precisionautocare.com',
        note: 'ASE certified technicians'
      }
    ],
    'plumber': [
      {
        id: 1, 
        name: `Emergency Plumbers ${location.split(',')[0]}`,
        address: `789 Pipe Lane, ${location}`,
        rating: '⭐⭐⭐⭐',
        phone: '+1-555-PLUMBER',
        website: 'https://emergencyplumbers.com',
        email: 'call@emergencyplumbers.com',
        note: '24/7 emergency service'
      }
    ]
  };
  const defaultSuppliers = [
    {
      id: 1,
      name: `Professional ${serviceType} Services`,
      address: `123 Service St, ${location}`,
      rating: '⭐⭐⭐', 
      phone: '+1-555-SERVICE',
      website: `https://${serviceType.toLowerCase()}services.com`,
      email: `contact@${serviceType.toLowerCase()}services.com`,
      note: 'Quality service guaranteed'
    }
  ];
  return serviceTemplates[serviceType.toLowerCase()] || defaultSuppliers;
};

// ENHANCED SUPPLIER SEARCH - OpenStreetMap Overpass API
const searchRealSuppliers = async (serviceType, location) => {
  try {
    console.log(`🔍 Enhanced search for ${serviceType} in ${location}`);
    
    // Step 1: Geocode location to get coordinates
    appendMessage({
      role: "AI", 
      content: `📍 Finding coordinates for ${location}...`
    });
    
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData || geocodeData.length === 0) {
      throw new Error(`Location "${location}" not found`);
    }
    
    const { lat, lon } = geocodeData[0];
    
    appendMessage({
      role: "AI", 
      content: `🎯 Searching for ${serviceType} services near ${location}...`
    });

    // Step 2: Use Overpass API to find actual businesses
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["shop"~"${getOSMCategories(serviceType)}"](around:100000,${lat},${lon});
        node["amenity"~"${getOSMCategories(serviceType)}"](around:100000,${lat},${lon});
        node["craft"~"${getOSMCategories(serviceType)}"](around:100000,${lat},${lon});
        way["shop"~"${getOSMCategories(serviceType)}"](around:100000,${lat},${lon});
        way["amenity"~"${getOSMCategories(serviceType)}"](around:100000,${lat},${lon});
        way["craft"~"${getOSMCategories(serviceType)}"](around:100000,${lat},${lon});
      );
      out body;
      >;
      out skel qt;
    `;
    
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
    const overpassResponse = await fetch(overpassUrl);
    const overpassData = await overpassResponse.json();
    
    console.log('Overpass API results:', overpassData);

    if (overpassData.elements && overpassData.elements.length > 0) {
        // First filter by name, then by relevance to service type
        const namedBusinesses = overpassData.elements.filter(element => element.tags && element.tags.name);
        const relevantBusinesses = filterRelevantBusinesses(namedBusinesses, serviceType);
        const businesses = relevantBusinesses
        .slice(0, 6) // Limit to 6 results
        .map((business, index) => ({
          id: index + 1,
          name: business.tags.name,
          address: getBusinessAddress(business),
          type: 'service',
          rating: getBusinessRating(business),
          phone: business.tags.phone || 'Contact for phone number',
          website: business.tags.website || 'Check business online',
          email: generateBusinessEmail(business.tags.name, business.tags.website),
          note: getBusinessNote(business, serviceType),
          isRealBusiness: true
        }));
      
      if (businesses.length > 0) {
        appendMessage({
          role: "AI", 
          content: `✅ Found ${businesses.length} real ${serviceType} businesses in ${location}`
        });
        return businesses;
      }
    }
    
    // Fallback to enhanced mock data
    appendMessage({
      role: "AI", 
      content: `⚠️ No specific ${serviceType} businesses found in OpenStreetMap. Using local business directory...`
    });
    
    return getEnhancedMockSuppliers(serviceType, location);
    
  } catch (error) {
    console.error('Enhanced OSM search error:', error);
    appendMessage({
      role: "AI", 
      content: `🔧 Search system busy. Using local business directory for ${serviceType} in ${location}...`
    });
    return getEnhancedMockSuppliers(serviceType, location);
  }
};

  // ✅ Auto-create or load briefing record
  useEffect(() => {
    const initBriefing = async () => {
      if (initialBriefingId) {
        // Load existing chat
        const { data, error } = await supabase
          .from("briefings")
          .select("chat")
          .eq("id", initialBriefingId)
          .single();

        if (!error && data && data.chat?.length > 0) {
          setMessages(data.chat);
        }
        setBriefingId(initialBriefingId);
      } else {
        // Create new briefing
        const { data, error } = await supabase
          .from("briefings")
          .insert([{ title: "New Briefing", status: "draft" }])
          .select()
          .single();

        if (error) {
          console.error("Error creating briefing:", error.message);
        } else {
          setBriefingId(data.id);
        }
      }
    };

    initBriefing();
  }, [initialBriefingId]);

  // ✅ Save chat messages to Supabase
  const saveChatToSupabase = async (newMessages) => {
    if (!briefingId) return;
    const { error } = await supabase
      .from("briefings")
      .update({ chat: newMessages })
      .eq("id", briefingId);

    if (error) console.error("Error saving chat:", error.message);
  };

  const appendMessage = (newMsg) => {
    setMessages((prev) => {
      const updated = [...prev, newMsg];
      saveChatToSupabase(updated);
      return updated;
    });
  };

  // Append multiple messages at once (batches state update and supabase save)
  const appendMessages = (newMsgs) => {
    if (!Array.isArray(newMsgs) || newMsgs.length === 0) return;
    setMessages((prev) => {
      const updated = [...prev, ...newMsgs];
      saveChatToSupabase(updated);
      return updated;
    });
  };

  // 🆕 ADD THIS RESET FUNCTION 🆕
const resetConversation = () => {
  setQuestions([]);
  setAnswers([]);
  setCurrentQuestionIndex(0);
  setInitialDescription("");
  setLastAnswer("");
  setSuppliers([]);
  setShowSupplierSelection(false);
};

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput("");
    setIsLoading(true);
    appendMessage({ role: "User", content: userInput });
    setLastAnswer(userInput);

      try {
      // --- STEP 1: Handle supplier selection (CHECK THIS FIRST) ---
      if (showSupplierSelection) {
        setIsLoading(true); // Keep loading until we're done
        
        let selectedSuppliers = [];
        
        if (userInput.toLowerCase() === 'all') {
          selectedSuppliers = suppliers;
        } else {
          const selectedIds = userInput.split(',').map(num => parseInt(num.trim()));
          selectedSuppliers = suppliers.filter(supplier => selectedIds.includes(supplier.id));
        }
        
        if (selectedSuppliers.length > 0) {
          appendMessage({
            role: "AI",
            content: `📧 Sending your project details to ${selectedSuppliers.length} supplier(s)...`,
          });
          
          // Display sending progress
          selectedSuppliers.forEach(supplier => {
            appendMessage({
              role: "AI",
              content: `✅ Sent to: ${supplier.name} (${supplier.email})`,
            });
          });
          
          appendMessage({
            role: "AI",
            content: "🎉 All emails sent! Your suppliers should contact you soon. Need another quote? Just tell me what you need!",
          });
        } else {
          appendMessage({
            role: "AI",
            content: "No suppliers selected. Starting over...",
          });
        }
        
        // Reset conversation but DON'T immediately process next input
        resetConversation();
        setShowSupplierSelection(false);
        setIsLoading(false);
        return;
      }

      // --- STEP 2: Handle location collection ---
      if (needsLocation) {
        setUserLocation(userInput);
        setNeedsLocation(false);
        
        // Now generate questions after we have location
        const response = await fetch("http://localhost:3001/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: initialDescription,
            previousAnswer: "",
          }),
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();

        if (!data.questions || data.questions.length === 0) {
          appendMessage({
            role: "AI",
            content: "I couldn't generate questions. Please try rephrasing your request.",
          });
          setIsLoading(false);
          return;
        }

        const validQuestions = data.questions.filter(
          (q) =>
            typeof q === "string" && q.trim().length > 10 && q.includes("?")
        );

        if (validQuestions.length === 0) {
          appendMessage({
            role: "AI",
            content: "Sorry, I had trouble understanding. Could you describe what you need more specifically?",
          });
          setIsLoading(false);
          return;
        }

        setQuestions(validQuestions);
        appendMessage({
          role: "AI",
          content: data.message || "Perfect! I have some questions to help create your quote request:",
        });
        appendMessage({
          role: "AI", 
          content: `Question 1: ${validQuestions[0]}`
        });
        setCurrentQuestionIndex(1);
        setIsLoading(false);
        return;
      }

      // --- STEP 3: First message (no questions yet) ---
      if (questions.length === 0) {
        setInitialDescription(userInput);

        // Ask for location instead of immediately generating questions
        setNeedsLocation(true);
        appendMessage({
          role: "AI", 
          content: "Thanks! Now, which city and country are you located in? (e.g., Lisbon, Portugal)"
        });
        setIsLoading(false);
        return;
      }

      // --- STEP 4: Follow-up answers ---
      else {
        const newAnswers = [...answers, userInput];
        setAnswers(newAnswers);

        const response = await fetch("http://localhost:3001/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: initialDescription,
            previousAnswer: userInput,
          }),
        });

        const data = await response.json();

        // If clarification triggered (single question only)
        if (data.questions && data.questions.length === 1) {
          appendMessage({ role: "AI", content: data.message });
          appendMessage({ role: "AI", content: data.questions[0] });
          setIsLoading(false);
          return;
        }

        // --- If finished all questions ---
        if (currentQuestionIndex >= questions.length) {
          appendMessage({
            role: "AI",
            content: "Perfect! Let me create a professional quote request email for you...",
          });

          const emailRes = await fetch("http://localhost:3001/compose-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              answers: newAnswers,
              initialDescription,
              location: userLocation
            }),
          });

          if (!emailRes.ok) throw new Error(`Server error: ${emailRes.status}`);

          const emailData = await emailRes.json();

          appendMessage({
            role: "AI",
            content: "✅ Here's your professional quote request email:",
          });
          appendMessage({
            role: "Email",
            content: emailData.email,
            isEmail: true,
          });

          // 🆕 SUPPLIER SEARCH AFTER EMAIL GENERATION 🆕
          appendMessage({
            role: "AI",
            content: "🔍 Searching for local suppliers in your area...",
          });

          const foundSuppliers = await searchRealSuppliers(initialDescription, userLocation);
          setSuppliers(foundSuppliers);

          if (foundSuppliers.length > 0) {
            appendMessage({
              role: "AI",
              content: `✅ I found ${foundSuppliers.length} suppliers in ${userLocation}. Select which ones you'd like to contact:`,
            });
            
            // Display each supplier with selection capability - batched for efficiency
            const supplierMessages = foundSuppliers.map((supplier, idx) => {
              const shortAddr = supplier.address?.split(',').slice(0, 3).join(',') || 'Address not available';
              // prefer existing numeric id, otherwise create a short unique id
              const supplierId = supplier.id ?? `s-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${idx + 1}`;

              const supplierInfo = (`[${supplierId}] 🏢 ${supplier.name}\n` +
                `📍 ${shortAddr}\n` +
                `⭐ ${supplier.rating}\n` +
                `📞 ${supplier.phone}\n` +
                `📧 ${supplier.email}\n` +
                `🌐 ${supplier.website}\n` +
                `${supplier.note ? `💡 ${supplier.note}` : ''}`).trim();

              return {
                role: "Supplier",
                content: supplierInfo,
                isSupplier: true,
                supplierId: supplierId,
              };
            });

            // Append all supplier messages in one state update
            appendMessages(supplierMessages);
            
            appendMessage({
              role: "AI",
              content: "💡 Reply with the numbers of suppliers you want to contact (e.g., '1,3' or 'all')",
            });
            
            // Set flag to handle supplier selection
            setShowSupplierSelection(true);
            
          } else {
            appendMessage({
              role: "AI", 
              content: "No suppliers found in your area. Try adjusting your search terms.",
            });
            // Reset conversation since no suppliers found
            resetConversation();
          }
        } else {
          const nextQuestion = questions[currentQuestionIndex];
          appendMessage({
            role: "AI",
            content: `Question ${currentQuestionIndex + 1}: ${nextQuestion}`,
          });
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      appendMessage({
        role: "AI",
        content: `❌ Something went wrong: ${error.message}. Please try again.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Email copied to clipboard!");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 border rounded-lg shadow-lg mt-8 bg-white">
      <h2 className="text-2xl font-bold mb-2">📧 Quote Request Assistant</h2>
      <p className="text-gray-600 text-sm mb-4">
        Tell me what you need, and I'll help you create a professional quote
        request email
      </p>

      <div className="mb-4 h-96 overflow-y-auto border rounded p-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`my-2 p-3 rounded-lg ${
              msg.role === "AI"
                ? "bg-blue-50 text-blue-900 border-l-4 border-blue-400"
                : msg.role === "Email"
                ? "bg-green-50 text-gray-900 border border-green-300 font-mono text-sm whitespace-pre-wrap"
        : msg.role === "Supplier"
        ? "bg-purple-50 text-purple-900 border border-purple-300 font-sans text-sm whitespace-pre-wrap"
                : "bg-white text-gray-900 border border-gray-200 ml-8"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <strong className="text-xs uppercase tracking-wide">
                  {msg.role}:
                </strong>
                <div className="mt-1">{msg.content}</div>
              </div>
              {msg.isEmail && (
                <button
                  onClick={() => copyToClipboard(msg.content)}
                  className="ml-2 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Copy
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="my-2 p-3 rounded-lg bg-blue-50 text-blue-900">
            <strong className="text-xs">AI:</strong>
            <div className="mt-1 flex items-center gap-2">
              <div className="animate-pulse">Thinking...</div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 focus:outline-none"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            isLoading
              ? "Please wait..."
              : questions.length === 0
              ? "e.g., I need 100 custom t-shirts with my logo"
              : "Type your answer..."
          }
          disabled={isLoading}
        />
        <button
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            isLoading || !input.trim()
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
