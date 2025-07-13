
import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner";

interface SignUpFormProps {
  onSuccess: () => void;
}

type SignUpStep = "credentials" | "verification";

const SignUpForm = ({ onSuccess }: SignUpFormProps) => {
  const [step, setStep] = useState<SignUpStep>("credentials");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_BASE_URL 

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    

    try {
      const res = await axios.post(`${api}/v1/user/send-code`, {
        email,
        username,
      });
      
      console.log("Code sent successfully:", res.data);
      
      toast.success("Code Sent! Please check your email for the verification code.");
      
      setStep("verification");
    } catch (error: any) {
      console.error("Send code error:", error);
      toast.error(error.response?.data?.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    
    setIsLoading(true);

    try {
      const res = await axios.post(`${api}/v1/user/verify-code`, {
        email,
        username,
        code,
        password,
      } , {
        withCredentials : true
      });
      
      console.log("Account created successfully:");
    
      toast.success("Success! Your account has been created successfully.");
      
      onSuccess();
    } catch (error: any) {
      console.error("Verify code error:", error);
      toast.error(error.response?.data?.message || "Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "credentials") {
    return (
      <form onSubmit={handleSendCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-username">Username</Label>
          <Input
            id="signup-username"
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Sending Code..." : "Send Verification Code"}
        </Button>
      </form>
    );
  }

  if (step === "verification") {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          We've sent a verification code to <strong>{email}</strong>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="verification-code">Verification Code</Label>
          <Input
            id="verification-code"
            type="text"
            placeholder="Enter the code from your email"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
        
        <Button 
          type="button" 
          variant="outline" 
          className="w-full" 
          onClick={() => setStep("credentials")}
        >
          Back
        </Button>
      </form>
    );
  }

  return null;
};

export default SignUpForm;