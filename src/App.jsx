import { use, useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  collection,
  getDocs,
  serverTimestamp,
  query,
  where
} from "firebase/firestore";

import { doc, setDoc, addDoc } from "firebase/firestore";
import { db } from "./firebase";

function App() {
  const [mode, setMode] = useState("login");

  // AUTH
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [showRequiredErrors, setShowRequiredErrors] = useState(false);

  // PROFILE
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [nickname, setNickname] = useState("");
  const [tc, setTc] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");

  // PAGE
  const [page, setPage] = useState("dashboard");

  // FIELD
  const [fieldName, setFieldName] = useState("");
  const [ownership, setOwnership] = useState("");
  const [size, setSize] = useState("");
  const [unit, setUnit] = useState("metrekare");

  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [neighborhood, setNeighborhood] = useState("");

  const [fields, setFields] = useState([]);

  // DATE PICKER
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const birthdate = `${day}/${month}/${year}`;

  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  // UNIT CALCULATOR
  const unitMultipliers = {
    metrekare: 1,
    dekar: 1000,
    dönüm: 1000,
    ar: 100,
    hektar: 10000
  };

  const convertedSquareMeters = Number(size || 0) * unitMultipliers[unit];

  // UI
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);


  //AUTH STATE LISTENER
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
    
      setUser(u);
    
      if (u) {
      
        setPage("dashboard");
      
        const q = query(
          collection(db, "fields"),
          where("userId", "==", u.uid)
        );
      
        const snapshot = await getDocs(q);
      
        const arr = [];
      
        snapshot.forEach((doc) => {
          arr.push({
            id: doc.id,
            ...doc.data()
          });
        });
      
        setFields(arr);
      
      } else {
      
        setFields([]);
      
      }
    
    });
  
    return () => unsub();
  
  }, []);

  useEffect(() => {
    if (month && year && day) {
      const maxDay = getDaysInMonth(Number(month), Number(year));

      if (Number(day) > maxDay) {
        setDay("");
      }
    }
  }, [month, year, day]);

  // RESET
  const resetFields = () => {
    setEmail("");
    setPassword("");
    setPassword2("");
    setName("");
    setSurname("");
    setNickname("");
    setDay("");
    setMonth("");
    setYear("");
    setError("");
    setShowRequiredErrors(false);
    setTc("");
    setGender("");
    setPhone("");
  };

  const switchToLogin = () => {
    setMode("login");
    resetFields();
  };

  const switchToRegister = () => {
    setMode("register");
    resetFields();
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case "auth/user-not-found":
        return "Email bulunamadı";
      case "auth/wrong-password":
        return "Şifre hatalı";
      case "auth/invalid-email":
        return "Geçersiz email";
      case "auth/too-many-requests":
        return "Çok fazla deneme yapıldı";
      case "auth/email-already-in-use":
        return "Bu email zaten kayıtlı";
      case "auth/weak-password":
        return "Şifre çok zayıf (en az 6 karakter)";
      default:
        return "Bir hata oluştu";
    }
  };

  // REGISTER
  const register = async () => {
    setError("");

    setShowRequiredErrors(true);

    if (!name || !surname || !day || !month || !year || !email || !password || !password2 || !tc || !gender || !phone) {
      setError("Lütfen tüm alanları doldur");
      return;
    }

    if (password !== password2) {
      setError("Şifreler uyuşmuyor");
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.toLowerCase().trim();

      const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      let finalNickname = nickname;
          
      if (!nickname.trim()) {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
      
        let count = 1;
      
        snapshot.forEach((doc) => {
          const data = doc.data();
        
          if (
            data.name &&
            data.name.toLowerCase() === name.toLowerCase()
          ) {
            count++;
          }
        });
      
        finalNickname = `${name}${count}`;
      }

      await setDoc(doc(db, "users", res.user.uid), {
        name,
        surname,
        nickname: finalNickname,
        birthdate,
        email: cleanEmail,
        tc,
        gender,
        phone,
        role: "user",
        createdAt: serverTimestamp()
      });

      setUser(res.user);
      setPage("addField");
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  // LOGIN
  const login = async () => {
    setError("");
    setLoading(true);

    try {
      let loginEmail = email.toLowerCase().trim();

      // email değilse kullanıcı ara
      if (!loginEmail.includes("@")) {

        const usersRef = collection(db, "users");

        let q;

        // telefon mu tc mi?
        if (loginEmail.length === 11) {
        
          // önce tc dene
          q = query(usersRef, where("tc", "==", loginEmail));
        
          let snapshot = await getDocs(q);
        
          // tc bulunamazsa telefonu dene
          if (snapshot.empty) {
            q = query(usersRef, where("phone", "==", loginEmail));
            snapshot = await getDocs(q);
          }
        
          if (snapshot.empty) {
            setError("Kullanıcı bulunamadı");
            setLoading(false);
            return;
          }
        
          loginEmail = snapshot.docs[0].data().email;
        }
        
        } else {
        
          q = query(usersRef, where("phone", "==", loginEmail));
        
          const snapshot = await getDocs(q);
        
          if (snapshot.empty) {
            setError("Kullanıcı bulunamadı");
            setLoading(false);
            return;
          }
        
          loginEmail = snapshot.docs[0].data().email;
        }

      const res = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        password
      );

      setUser(res.user);
      setPage("dashboard");

    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  // TARLA KAYDETME
  const saveField = async () => {

    if (
      !fieldName ||
      !ownership ||
      !size ||
      !unit ||
      !city ||
      !district ||
      !neighborhood
    ) {
      setError("Lütfen tüm tarla bilgilerini doldur");
      return;
    }

    try {

      await addDoc(collection(db, "fields"), {
        userId: user.uid,

        fieldName,
        ownership,

        size,
        unit,

        squareMeters: convertedSquareMeters,

        city,
        district,
        neighborhood,

        createdAt: serverTimestamp()
      });

      // listeye ekle
      loadFields();

      // temizle
      setFieldName("");
      setOwnership("");
      setSize("");
      setUnit("metrekare");
      setCity("");
      setDistrict("");
      setNeighborhood("");

      setPage("dashboard");

    } catch (err) {
      setError("Tarla kaydedilemedi");
    }
  };

  // TARLA GÖSTERME
  const loadFields = async () => {

    if (!user) return;

    const q = query(
      collection(db, "fields"),
      where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    const arr = [];

    snapshot.forEach((doc) => {
      arr.push({
        id: doc.id,
        ...doc.data()
      });
    });

    setFields(arr);
  };

  // LOGOUT
  const logout = async () => {
    await signOut(auth);
  };

  // ================= USER PAGES =================
  if (user) {
  
    // TARLA EKLEME SAYFASI
    if (page === "addField") {
    
      return (
        <div className="min-h-screen bg-green-100 flex items-center justify-center p-4">
        
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
      
            <h1 className="text-2xl font-bold mb-4 text-center">
              Tarla Ekle
            </h1>
      
            {error && (
              <p className="text-red-500 text-sm mb-2">
                {error}
              </p>
            )}
  
            <input
              className="w-full border p-2 mb-2"
              placeholder="Tarla İsmi"
              value={fieldName}
              onChange={(e)=>setFieldName(e.target.value)}
            />
  
            <select
              className="w-full border p-2 mb-2"
              value={ownership}
              onChange={(e)=>setOwnership(e.target.value)}
            >
              <option value="">Sahiplik</option>
              <option value="Kendi">Kendi</option>
              <option value="Kiralık">Kiralık</option>
            </select>
          
            <div className="flex gap-2 mb-2">
          
              <input
                type="number"
                className="border p-2 flex-1"
                placeholder="Boyut"
                value={size}
                onChange={(e)=>setSize(e.target.value)}
              />
  
              <select
                className="border p-2"
                value={unit}
                onChange={(e)=>setUnit(e.target.value)}
              >
                <option value="metrekare">m²</option>
                <option value="dekar">Dekar</option>
                <option value="dönüm">Dönüm</option>
                <option value="ar">Ar</option>
                <option value="hektar">Hektar</option>
              </select>
          
            </div>
          
            <div className="text-sm text-gray-600 mb-3">
              {convertedSquareMeters} m²
            </div>
          
            <input
              className="w-full border p-2 mb-2"
              placeholder="İl"
              value={city}
              onChange={(e)=>setCity(e.target.value)}
            />
  
            <input
              className="w-full border p-2 mb-2"
              placeholder="İlçe"
              value={district}
              onChange={(e)=>setDistrict(e.target.value)}
            />
  
            <input
              className="w-full border p-2 mb-4"
              placeholder="Mahalle"
              value={neighborhood}
              onChange={(e)=>setNeighborhood(e.target.value)}
            />
  
            <button
              onClick={saveField}
              className="w-full bg-green-500 text-white p-2 rounded"
            >
              Tarlayı Kaydet
            </button>
          
          </div>
        </div>
      );
    }
  
    // DASHBOARD
    return (
      <div className="min-h-screen bg-green-100 p-6">
      
        <div className="max-w-3xl mx-auto">
    
          <div className="bg-white p-6 rounded shadow mb-4">
    
            <h1 className="text-2xl font-bold">
              TAFDU Dashboard
            </h1>
    
            <p className="mt-2">
              Hoş geldin, {user.email}
            </p>
    
            <div className="flex gap-2 mt-4">
    
              <button
                onClick={() => setPage("addField")}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Yeni Tarla Ekle
              </button>
    
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Logout
              </button>
    
            </div>
          </div>
    
          <div className="space-y-4">
    
            {fields.map((field) => (
            
              <div
                key={field.id}
                className="bg-white p-4 rounded shadow"
              >
              
                <h2 className="text-xl font-bold">
                  {field.fieldName}
                </h2>
            
                <p>Sahiplik: {field.ownership}</p>
            
                <p>
                  Boyut: {field.size} {field.unit}
                </p>
            
                <p>
                  m²: {field.squareMeters}
                </p>
            
                <p>
                  Konum:
                  {" "}
                  {field.city} /
                  {" "}
                  {field.district} /
                  {" "}
                  {field.neighborhood}
                </p>
            
              </div>
            ))}
  
          </div>
          
        </div>
      </div>
    );
  }

  // ================= LOGIN =================
  if (mode === "login") {
    return (
      <div className="h-screen flex items-center justify-center bg-blue-100">
              <div
        className="bg-white p-6 rounded shadow w-80"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            login();
          }
        }}
      >

          <h1 className="text-xl font-bold mb-4 text-center">TAFDU Login</h1>

          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

          <input
            className="w-full border p-2 mb-2"
            placeholder="Email / Telefon / TC *"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />

          <div className="relative mb-3">
            <input
              className="w-full border p-2 pr-10"
              type={showPassword ? "text" : "password"}
              placeholder="Şifre *"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={()=>setShowPassword(!showPassword)}
              className="absolute right-2 top-2"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          

          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 mb-2"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          <p
            className="text-center text-blue-600 cursor-pointer"
            onClick={switchToRegister}
          >
            Hesabın yok mu? Kayıt ol
          </p>
        </div>
      </div>
    );
  }

  // ================= REGISTER =================
  return (
    <div className="h-screen flex items-center justify-center bg-blue-100">
          <div
      className="bg-white p-6 rounded shadow w-80"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          register();
        }
      }}
    >

        <h1 className="text-xl font-bold mb-4 text-center">Kayıt Ol</h1>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <input
          placeholder="İsim *"
          className={`w-full border p-2 mb-2 ${
            showRequiredErrors && !name ? "border-red-500 bg-red-50" : ""
          }`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input 
          className="w-full border p-2 mb-2"
          placeholder="Soyisim *"
          className={`w-full border p-2 mb-2 ${
            showRequiredErrors && !surname ? "border-red-500 bg-red-50" : ""
          }`}
          value={surname} 
          onChange={(e)=>setSurname(e.target.value)} 
        />

        <input className="w-full border p-2 mb-2" placeholder="Nickname" value={nickname} onChange={(e)=>setNickname(e.target.value)} />

        <input
          className={`w-full border p-2 mb-2 ${
            showRequiredErrors && !tc ? "border-red-500 bg-red-50" : ""
          }`}
          placeholder="TC Kimlik No *"
          value={tc}
          onChange={(e) => setTc(e.target.value)}
        />

        <select
          className={`w-full border p-2 mb-2 ${
            showRequiredErrors && !gender ? "border-red-500 bg-red-50" : ""
          }`}
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="">Cinsiyet</option>
          <option value="Erkek">Erkek</option>
          <option value="Kadın">Kadın</option>
        </select>
        
        <input
          className={`w-full border p-2 mb-2 ${
            showRequiredErrors && !phone ? "border-red-500 bg-red-50" : ""
          }`}
          placeholder="Telefon No *"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* DATE PICKER */}
        <div className="mb-3">
          <label className="text-sm font-medium">
            Doğum Tarihi <span className="text-red-500">*</span>
          </label>
                
          <div className="flex gap-2 mt-1">
                
            {/* GÜN */}
            <select
              className={`border p-2 flex-1 ${
                showRequiredErrors && !day ? "border-red-500 bg-red-50" : ""
              }`}
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              <option value="">Gün</option>
            
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
              
            {/* AY */}
            <select
              className={`border p-2 flex-1 ${
                showRequiredErrors && !month ? "border-red-500 bg-red-50" : ""
              }`}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">Ay</option>
            
              {months.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            
            {/* YIL */}
            <select
              className={`border p-2 flex-1 ${
                showRequiredErrors && !year ? "border-red-500 bg-red-50" : ""
              }`}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">Yıl</option>
            
              {Array.from({ length: 80 }, (_, i) => {
                const y = 2026 - i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
            
          </div>
        </div>

        <input
          className={`w-full border p-2 mb-2 ${
            showRequiredErrors && !email ? "border-red-500 bg-red-50" : ""
          }`}
          placeholder="Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative mb-2">
          <input
            className={`w-full border p-2 pr-10 ${
              showRequiredErrors && !password ? "border-red-500 bg-red-50" : ""
            }`}
            type={showPassword ? "text" : "password"}
            placeholder="Şifre *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={()=>setShowPassword(!showPassword)}
            className="absolute right-2 top-2"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <input
          className={`w-full border p-2 mb-4 ${
            showRequiredErrors && !password2 ? "border-red-500 bg-red-50" : ""
          }`}
          type="password"
          placeholder="Şifre Tekrar *"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />

        <button
          onClick={register}
          disabled={loading}
          className="w-full bg-green-500 text-white p-2 mb-2"
        >
          {loading ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
        </button>

        <p
          className="text-center text-blue-600 cursor-pointer"
          onClick={switchToLogin}
        >
          Zaten hesabın var mı? Giriş yap
        </p>
      </div>
    </div>
  );
}

export default App;
