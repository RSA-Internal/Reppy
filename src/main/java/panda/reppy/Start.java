package panda.reppy;

import panda.reppy.util.Bot;

public class Start {

    public static void main(String[] args) {
        if (args.length < 2) {
            System.err.println("BotToken, dbURI, or both not provided.");
            System.out.println("Format: <jar> [botToken] [dbToken]");
            System.exit(0);
        }

        try {
            // Instantiate a new bot instance.
            new Bot(args[0], args[1]);
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Failed to login to bot.");
            System.exit(0);
        }
    }
}
